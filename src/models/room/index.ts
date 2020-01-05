import { Message as MesaMessage } from '@cryb/mesa'

import Invite from '../invite'
import Message from '../message'
import User, { UserResolvable } from '../user'

import StoredInvite from '../../schemas/invite.schema'
import StoredMessage from '../../schemas/message.schema'
import StoredUser from '../../schemas/user.schema'

import { createPortal, destroyPortal } from '../../drivers/portals.driver'
import StoredRoom from '../../schemas/room.schema'
import IRoom, { IPortalAllocation, RoomType } from './defs'

import config from '../../config/defaults'
import client from '../../config/redis.config'
import dispatcher from '../../config/dispatcher.config'
import {
	ControllerIsNotAvailable,
	PortalNotOpen,
	RoomNotFound,
	UserAlreadyInRoom,
	UserDoesNotHaveRemote,
	UserIsNotPermitted
} from '../../utils/errors.utils'
import { generateFlake } from '../../utils/generate.utils'
import { extractUserId, GroupedMessage, groupMessages } from '../../utils/helpers.utils'
import { fetchRoomMemberIds } from '../../utils/fetchers.utils'

export type RoomResolvable = Room | string

export default class Room {
	public id: string
	public createdAt: number
	public endedAt?: number

	public type: RoomType
	public active: boolean
	public invites: Invite[]
	public owner: UserResolvable

	public portal?: IPortalAllocation
	public controller: UserResolvable

	public name: string

	public members: User[]
	public messages: GroupedMessage[] = []

	public online: string[]

	constructor(json?: IRoom) {
		if (!json)
			return

		this.setup(json)
	}

	public load = (id: string) => new Promise<Room>(async (resolve, reject) => {
		try {
			const doc = await StoredRoom.findOne({ 'info.id': id })

			if (!doc)
				return reject(RoomNotFound)

			this.setup(doc)

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public create = (name: string, creator: User) => new Promise<Room>(async (resolve, reject) => {
		if (creator.room)
			return reject(UserAlreadyInRoom)

		try {
			const json: IRoom = {
				info: {
					id: generateFlake(),
					createdAt: Date.now(),

					type: 'vm',
					portal: {
						status: 'waiting',
						lastUpdatedAt: Date.now()
					},

					owner: creator.id,
					controller: creator.id
				},
				profile: {
					name
				}
			}

			const stored = new StoredRoom(json)
			await stored.save()

			this.setup(json)

			await this.createInvite(creator, false) // System prop false as data will be delivered over REST
			await creator.joinRoom(this, true)

			client.hset('controller', this.id, creator.id)

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	/**
	 * The system prop indicates if the invite was created by a Cryb update
	 */
	public createInvite = (creator: User, system: boolean) => new Promise<Invite>(async (resolve, reject) => {
		try {
			const invite = await new Invite().create(
				this,
				'room',
				{ maxUses: 0, unlimitedUses: true },
				{ system: true },
				creator
			)

			if (!this.invites)
				this.invites = []

			this.invites.push(invite)

			if (system) {
				const message = new MesaMessage(0, invite, 'INVITE_UPDATE')
				dispatcher.dispatch(message, [extractUserId(this.owner)])
			}

			resolve(invite)
		} catch (error) {
			reject(error)
		}
	})

	public transferOwnership = (to: User) => new Promise<Room>(async (resolve, reject) => {
		try {
			const newOwnerId = extractUserId(to)

			await StoredRoom.updateOne({
				'info.id': this.id
			}, {
				$set: {
					'info.owner': newOwnerId
				}
			})

			const message = new MesaMessage(0, { u: newOwnerId }, 'OWNER_UPDATE')
			dispatcher.dispatch(message, await fetchRoomMemberIds(this))

			this.owner = to

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public fetchMembers = (index: number = 0) => new Promise<Room>(async (resolve, reject) => {
		try {
			const docs = await StoredUser.find({ 'info.room': this.id }).skip(index).limit(10)

			if (docs.length === 0)
				return resolve(this)

			const members = docs.map(doc => new User(doc))
			this.members = members

			const ownerId = extractUserId(this.owner),
				controllerId = extractUserId(this.controller)

			members.forEach(member => {
				if (ownerId === member.id)
					this.owner = member

				if (controllerId === member.id)
					this.controller = member
			})

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public fetchOnlineMemberIds = () => new Promise<Room>(async (resolve, reject) => {
		try {
			const memberIds = await StoredUser.distinct('info.id', { 'info.room': this.id }),
				connectedClientIds: string[] = await client.smembers(config.mesa_namespace ? `connected_clients_${config.mesa_namespace}` : 'connected_clients')

			this.online = connectedClientIds.filter(id => memberIds.indexOf(id) > -1)

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public fetchMessages = (index: number = 0) => new Promise<Room>(async (resolve, reject) => {
		try {
			const docs = await StoredMessage.find({ 'info.room': this.id }).sort({ 'info.createdAt': -1 }).skip(index).limit(50)

			if (docs.length === 0)
				return resolve(this)

			const messages = docs.map(doc => new Message(doc))
			this.messages = groupMessages(messages.reverse())

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public fetchInvites = (index: number = 0) => new Promise<Room>(async (resolve, reject) => {
		try {
			const docs = await StoredInvite.find({
				$and: [
					{
						'info.targetId': this.id
					},
					{
						'info.targetType': 'room'
					},
					{
						'info.active': true
					}
				]
			}).skip(index).limit(10)

			if (docs.length === 0)
				return resolve(this)

			const invites = docs.map(doc => new Invite(doc))
			this.invites = invites

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public refreshInvites = (user: User, system: boolean) => new Promise<Invite>(async (resolve, reject) => {
		try {
			await this.destroyInvites()

			const invite = await this.createInvite(user, system)

			resolve(invite)
		} catch (error) {
			reject(error)
		}
	})

	public destroyInvites = () => new Promise<Room>(async (resolve, reject) => {
		try {
			await StoredInvite.deleteMany({
				$and: [
					{
						'info.targetId': this.id
					},
					{
						'info.targetType': 'room'
					}
				]
			})

			this.invites = []

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public setPortalId = (id: string) => new Promise<Room>(async (resolve, reject) => {
		try {
			const allocation: IPortalAllocation = {
				id,
				status: 'creating',
				lastUpdatedAt: Date.now()
			}

			await StoredRoom.updateOne({
				'info.id': this.id
			}, {
				$set: {
					'info.portal': allocation
				}
			})

			const message = new MesaMessage(0, allocation, 'PORTAL_UPDATE')
			dispatcher.dispatch(message, await fetchRoomMemberIds(this))

			this.portal = allocation

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public updatePortalAllocation = (allocation: IPortalAllocation) => new Promise<Room>(async (resolve, reject) => {
		allocation.lastUpdatedAt = Date.now()

		try {
			const currentAllocation = this.portal
			Object.keys(allocation).forEach(key => currentAllocation[key] = allocation[key])

			if (currentAllocation.status === 'closed')
				delete currentAllocation.id

			await StoredRoom.updateOne({
				'info.id': this.id
			}, {
				$set: {
					'info.portal': currentAllocation
				}
			})

			this.portal = currentAllocation

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public takeControl = (from: UserResolvable) => new Promise<Room>(async (resolve, reject) => {
		const fromId = extractUserId(from)

		if (this.controller !== null)
			return reject(ControllerIsNotAvailable)

		try {
			await StoredRoom.updateOne({
				'info.id': this.id
			}, {
				$set: {
					'info.controller': fromId
				}
			})

			client.hset('controller', this.id, fromId)

			const message = new MesaMessage(0, { u: fromId }, 'CONTROLLER_UPDATE')
			dispatcher.dispatch(message, await fetchRoomMemberIds(this), [fromId])

			this.controller = fromId

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public giveControl = (to: UserResolvable, from: UserResolvable) => new Promise<Room>(async (resolve, reject) => {
		const ownerId = extractUserId(this.owner),
			controllerId = extractUserId(this.controller),
			toId = extractUserId(to),
			fromId = extractUserId(from)

		if (fromId !== controllerId && fromId !== ownerId)
			return reject(UserDoesNotHaveRemote)

		try {
			await StoredRoom.updateOne({
				'info.id': this.id
			}, {
				$set: {
					'info.controller': toId
				}
			})

			client.hset('controller', this.id, toId)

			const message = new MesaMessage(0, { u: toId }, 'CONTROLLER_UPDATE')
			dispatcher.dispatch(message, await fetchRoomMemberIds(this), [fromId])

			this.controller = toId

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public releaseControl = (sender: UserResolvable) => new Promise<Room>(async (resolve, reject) => {
		const ownerId = extractUserId(this.owner),
			senderId = extractUserId(sender),
			controllerId = extractUserId(this.controller)

		if (senderId !== ownerId && senderId !== controllerId)
			return reject(UserIsNotPermitted)

		try {
			await StoredRoom.updateOne({
				'info.id': this.id
			}, {
				$set: {
					'info.controller': null
				}
			})

			client.hdel('controller', this.id)

			const message = new MesaMessage(0, { u: null }, 'CONTROLLER_UPDATE')
			dispatcher.dispatch(message, await fetchRoomMemberIds(this), [senderId])

			this.controller = null

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public createPortal = () => createPortal(this)

	public restartPortal = () => new Promise(async (resolve, reject) => {
		if (this.portal.status !== 'open')
			return reject(PortalNotOpen)

		try {
			await this.destroyPortal()
			await this.createPortal()

			resolve()
		} catch (error) {
			reject(error)
		}
	})

	public destroyPortal = async () => {
		await destroyPortal(this)
		await this.updatePortalAllocation({ status: 'closed' })

		delete this.portal
	}

	public updateType = (type: RoomType) => new Promise<Room>(async (resolve, reject) => {
		try {
			await StoredRoom.updateOne({
				'info.id': this.id
			}, {
				$set: {
					'info.type': type
				}
			})

			this.type = type

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public destroy = () => new Promise(async (resolve, reject) => {
		try {
			const message = new MesaMessage(0, {}, 'ROOM_DESTROY')
			dispatcher.dispatch(message, await fetchRoomMemberIds(this))

			await StoredRoom.deleteOne({ 'info.id': this.id })
			await StoredMessage.deleteMany({ 'info.room': this.id })

			await StoredUser.updateMany({
				'info.room': this.id
			}, {
				$unset: {
					'info.room': ''
				}
			})

			await this.destroyInvites()

			if (this.portal)
				destroyPortal(this)

			await client.hdel('controller', this.id)

			resolve()
		} catch (error) {
			reject(error)
		}
	})

	public setup = (json: IRoom) => {
		this.id = json.info.id
		this.createdAt = json.info.createdAt
		this.endedAt = json.info.endedAt

		this.type = json.info.type
		this.portal = json.info.portal

		this.owner = json.info.owner
		this.controller = json.info.controller

		this.name = json.profile.name
	}

	public prepare = () => ({
		...this,
		members: this.members.map(member => typeof member === 'string' ? member : member.prepare())
	} as Room)
}

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

import dispatcher from '../../config/dispatcher.config'

import client from '../../config/redis.config'
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
    if (!json) return

    this.setup(json)
  }

  public async load(id: string) {
    const doc = await StoredRoom.findOne({ 'info.id': id })
    if (!doc)
      throw RoomNotFound

    this.setup(doc)

    return this
  }

  public async create(name: string, creator: User) {
    if (creator.room)
      throw UserAlreadyInRoom

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

    return this
  }

  /**
   * The system prop indicates if the invite was created by a Cryb update
   */
  public async createInvite(creator: User, system: boolean) {
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

    return this
  }

  public async transferOwnership(to: User) {
    const newOwnerId = extractUserId(to)

    await StoredRoom.updateOne({
      'info.id': this.id
    }, {
      $set: {
        'info.owner': newOwnerId
      }
    })

    const message = new MesaMessage(0, { u: newOwnerId }, 'OWNER_UPDATE')
    dispatcher.dispatch(message, this.members.map(extractUserId))

    this.owner = to

    return this
  }

  public async fetchMembers(index: number = 0) {
    const docs = await StoredUser.find({ 'info.room': this.id }).skip(index).limit(10)

    if (docs.length === 0)
      return this

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

    return this
  }

  public async fetchOnlineMemberIds() {
    const memberIds = await StoredUser.distinct('info.id', { 'info.room': this.id })
    const connectedClientIds: string[] = await client.smembers('connected_clients')

    this.online = connectedClientIds.filter(id => memberIds.indexOf(id) > -1)

    return this
  }

  public async fetchMessages(index: number = 0) {
    const docs = await StoredMessage.find({ 'info.room': this.id }).sort({ 'info.createdAt': -1 }).skip(index).limit(50)

    if (docs.length === 0)
      return this

    const messages = docs.map(doc => new Message(doc))
    this.messages = groupMessages(messages.reverse())

    return this
  }

  public async fetchInvites(index: number = 0) {
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
      return this

    const invites = docs.map(doc => new Invite(doc))
    this.invites = invites

    return this
  }

  public async refreshInvites(user: User, system: boolean) {
    await this.destroyInvites()

    const invite = await this.createInvite(user, system)

    return invite
  }

  public async destroyInvites() {
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

    return this
  }

  public async setPortalId(id: string) {
    const allocation: IPortalAllocation = {
      id,
      janusId: 1,
      janusIp: '0.0.0.0',
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
    dispatcher.dispatch(message, this.members.map(extractUserId))

    this.portal = allocation

    return this
  }

  public async updatePortalAllocation(allocation: IPortalAllocation) {
    allocation.lastUpdatedAt = Date.now()

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

    return this
  }

  public async takeControl(from: UserResolvable) {
    const fromId = extractUserId(from)

    if (this.controller !== null)
      throw ControllerIsNotAvailable

    await StoredRoom.updateOne({
      'info.id' :this.id
    }, {
      $set: {
        'info.controller': fromId
      }
    })

    client.hset('controller', this.id, fromId)

    const message = new MesaMessage(0, { u: fromId }, 'CONTROLLER_UPDATE')
    dispatcher.dispatch(message, this.members.map(extractUserId), [fromId])

    this.controller = fromId

    return this
  }

  public async giveControl(to: UserResolvable, from: UserResolvable) {
    const ownerId = extractUserId(this.owner)
    const controllerId = extractUserId(this.controller)
    const toId = extractUserId(to)
    const fromId = extractUserId(from)

    if (fromId !== controllerId && fromId !== ownerId)
      throw UserDoesNotHaveRemote

    await StoredRoom.updateOne({
      'info.id': this.id
    }, {
      $set: {
        'info.controller': toId
      }
    })

    client.hset('controller', this.id, toId)

    const message = new MesaMessage(0, { u: toId }, 'CONTROLLER_UPDATE')
    dispatcher.dispatch(message, this.members.map(extractUserId), [fromId])

    this.controller = toId

    return this
  }

  public async releaseControl(sender: UserResolvable) {
    const ownerId = extractUserId(this.owner),
        senderId = extractUserId(sender),
        controllerId = extractUserId(this.controller)

    if (senderId !== ownerId && senderId !== controllerId)
      throw UserIsNotPermitted

    await StoredRoom.updateOne({
      'info.id': this.id
    }, {
      $set: {
        'info.controller': null
      }
    })

    client.hdel('controller', this.id)

    const message = new MesaMessage(0, { u: null }, 'CONTROLLER_UPDATE')
    dispatcher.dispatch(message, this.members.map(extractUserId), [senderId])

    this.controller = null

    return this
  }

  public async createPortal() {
    createPortal(this)
  }

  public async restartPortal() {
    if (this.portal.status !== 'open')
      throw PortalNotOpen

    await this.destroyPortal()
    await this.createPortal()
  }

  public async destroyPortal() {
    await destroyPortal(this)
    await this.updatePortalAllocation({ status: 'closed' })

    delete this.portal
  }

  public async updateType(type: RoomType) {
    await StoredRoom.updateOne({
      'info.id': this.id
    }, {
      $set: {
        'info.type': type
      }
    })

    this.type = type

    return this
  }

  public async destroy() {
    const message = new MesaMessage(0, {}, 'ROOM_DESTROY')
    dispatcher.dispatch(message, this.members.map(extractUserId))

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
  }

  public setup(json: IRoom) {
    this.id = json.info.id
    this.createdAt = json.info.createdAt
    this.endedAt = json.info.endedAt

    this.type = json.info.type
    this.portal = json.info.portal

    this.owner = json.info.owner
    this.controller = json.info.controller

    this.name = json.profile.name
  }

  public prepare() {
    return {
      ...this,
      members: this.members.map(member => typeof member === 'string' ? member : member.prepare())
    } as Room
  }
}

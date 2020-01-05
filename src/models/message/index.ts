import { Message as MesaMessage } from '@cryb/mesa'

import Room, { RoomResolvable } from '../room'
import User, { UserResolvable } from '../user'

import StoredMessage from '../../schemas/message.schema'
import IMessage from './defs'

import { MessageNotFound, UserNotInRoom } from '../../utils/errors.utils'
import { generateFlake } from '../../utils/generate.utils'
import { extractRoomId, extractUserId } from '../../utils/helpers.utils'
import dispatcher from '../../config/dispatcher.config'
import { fetchRoomMemberIds } from '../../utils/fetchers.utils'

export type MessageResolvable = Message | string

export default class Message {
	public id: string
	public createdAt: number

	public author: UserResolvable
	public room: RoomResolvable

	public content: string

	constructor(json?: IMessage) {
		if (!json)
			return

		this.setup(json)
	}

	public load = (id: string) => new Promise<Message>(async (resolve, reject) => {
		try {
			const doc = await StoredMessage.findOne({ 'info.id': id })

			if (!doc)
				throw MessageNotFound

			this.setup(doc)

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public create = (content: string, author: User) => new Promise<Message>(async (resolve, reject) => {
		if (!author.room)
			return reject(UserNotInRoom)

		const roomId = extractRoomId(author.room)

		try {
			const json: IMessage = {
				info: {
					id: generateFlake(),
					createdAt: Date.now(),
					author: author.id,
					room: roomId
				},
				data: {
					content
				}
			}

			const stored = new StoredMessage(json)
			await stored.save()

			this.setup(json)

			const message = new MesaMessage(0, this, 'MESSAGE_CREATE')
			console.log(message, await fetchRoomMemberIds(author.room), [author.id])
			dispatcher.dispatch(message, await fetchRoomMemberIds(author.room), [author.id])

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public fetchAuthor = () => new Promise<Message>(async (resolve, reject) => {
		const authorId = extractUserId(this.author)

		try {
			const author = await new User().load(authorId)
			this.author = author

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public fetchRoom = () => new Promise<Message>(async (resolve, reject) => {
		const roomId = extractRoomId(this.room)

		try {
			const room = await new Room().load(roomId)
			this.room = room

			resolve(this)
		} catch (error) {
			reject(error)
		}
	})

	public destroy = (requester?: User) => new Promise(async (resolve, reject) => {
		try {
			await StoredMessage.deleteOne({
				'info.id': this.id
			})

			const message = new MesaMessage(0, { id: this.id }, 'MESSAGE_DESTROY')
			dispatcher.dispatch(message, await fetchRoomMemberIds(this.room), [extractUserId(requester || this.author)])

			resolve()
		} catch (error) {
			reject(error)
		}
	})

	public setup = (json: IMessage) => {
		this.id = json.info.id
		this.createdAt = json.info.createdAt

		this.content = json.data.content

		if (!this.author)
			this.author = json.info.author

		if (!this.room)
			this.room = json.info.room
	}
}

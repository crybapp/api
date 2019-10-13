import User from '../user'
import Room from '../room'

import WSMessage from '../../server/websocket/models/message'

import IMessage from './defs'
import StoredMessage from '../../schemas/message.schema'

import { extractUserId } from '../../utils/helpers.utils'
import { generateFlake } from '../../utils/generate.utils'
import { UserNotInRoom, MessageNotFound } from '../../utils/errors.utils'

export type MessageResolvable = Message | string

export default class Message {
    id: string
    createdAt: number

    author: User | string
    room: Room | string

    content: string
    
    constructor(json?: IMessage) {
        if(!json) return

        this.setup(json)
    }
    
    load = (id: string) => new Promise<Message>(async (resolve, reject) => {
        try {
            const doc = await StoredMessage.findOne({ 'info.id': id })
            if(!doc) throw MessageNotFound

            this.setup(doc)

            resolve(this)
        } catch(error) {
            reject(error)
        }
    })

    create = (content: string, author: User) => new Promise<Message>(async (resolve, reject) => {
        if(!author.room) return reject(UserNotInRoom)

        const roomId = typeof author.room === 'string' ? author.room : author.room.id

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

            const message = new WSMessage(0, this, 'MESSAGE_CREATE')
            message.broadcastRoom(author.room, [ author.id ])

            resolve(this)
        } catch(error) {
            reject(error)
        }
    })

    fetchAuthor = () => new Promise<Message>(async (resolve, reject) => {
        const authorId = typeof this.author === 'string' ? this.author : this.author.id

        try {
            const author = await new User().load(authorId)
            this.author = author

            resolve(this)
        } catch(error) {
            reject(error)
        }
    })

    fetchRoom = () => new Promise<Message>(async (resolve, reject) => {
        const roomId = typeof this.room === 'string' ? this.room : this.room.id

        try {
            const room = await new Room().load(roomId)
            this.room = room

            resolve(this)
        } catch(error) {
            reject(error)
        }
    })

    destroy = (requester?: User) => new Promise(async (resolve, reject) => {
        try {
            await StoredMessage.deleteOne({
                'info.id': this.id
            })

            const message = new WSMessage(0, { id: this.id }, 'MESSAGE_DESTROY')
            message.broadcastRoom(this.room, [ extractUserId(requester || this.author) ])

            resolve()
        } catch(error) {
            reject(error)
        }
    })

    setup = (json: IMessage) => {
        this.id = json.info.id
        this.createdAt = json.info.createdAt

        this.content = json.data.content

        if(!this.author) this.author = json.info.author
        if(!this.room) this.room = json.info.room
    }
}
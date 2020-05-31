import { Message as MesaMessage } from '@cryb/mesa'

import Room, { RoomResolvable } from '../room'
import User, { UserResolvable } from '../user'

import StoredMessage from '../../schemas/message.schema'
import IMessage from './defs'

import dispatcher from '../../config/dispatcher.config'
import { MessageNotFound, UserNotInRoom } from '../../utils/errors.utils'
import { fetchRoomMemberIds } from '../../utils/fetchers.utils'
import { generateFlake } from '../../utils/generate.utils'
import { extractRoomId, extractUserId } from '../../utils/helpers.utils'

export type MessageResolvable = Message | string

export default class Message {
  public id: string
  public createdAt: number

  public author: UserResolvable
  public room: RoomResolvable

  public content: string

  constructor(json?: IMessage) {
    if(!json)
      return

    this.setup(json)
  }

  public async load(id: string) {
    const doc = await StoredMessage.findOne({ 'info.id': id })

    if(!doc)
      throw MessageNotFound

    this.setup(doc)

    return this
  }

  public async create(content: string, author: User) {
    if(!author.room)
      throw UserNotInRoom

    const roomId = extractRoomId(author.room)

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
    dispatcher.dispatch(message, await fetchRoomMemberIds(author.room), [author.id])

    return this
  }

  public async fetchAuthor() {
    const authorId = extractUserId(this.author)

    const author = await new User().load(authorId)
    this.author = author

    return this
  }

  public async fetchRoom() {
    const roomId = extractRoomId(this.room)

    const room = await new Room().load(roomId)
    this.room = room

    return this
  }

  public async destroy(requester?: User) {
    await StoredMessage.deleteOne({
      'info.id': this.id
    })

    const message = new MesaMessage(0, { id: this.id }, 'MESSAGE_DESTROY')
    dispatcher.dispatch(message, await fetchRoomMemberIds(this.room), [extractUserId(requester || this.author)])
  }

  public setup(json: IMessage) {
    this.id = json.info.id
    this.createdAt = json.info.createdAt

    this.content = json.data.content

    if(!this.author)
      this.author = json.info.author

    if(!this.room)
      this.room = json.info.room
  }
}

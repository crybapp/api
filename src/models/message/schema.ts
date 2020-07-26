import { model, Schema } from 'mongoose'

import { IStoredMessage } from './defs'

const MessageSchema = new Schema({
  info: {
    id: String,
    createdAt: Number,
    author: String,
    room: String
  },
  data: {
    content: String
  }
}, {
  typeKey: '$type'
})

const StoredMessage = model<IStoredMessage>('Message', MessageSchema)
export default StoredMessage

import { model, Schema } from 'mongoose'

import { IStoredBan } from './defs'

const BanSchema = new Schema({
  info: {
    id: String,
    createdAt: Number,
    createdBy: String,

    active: Boolean
  },
  data: {
    userId: String,
    reason: String
  }
}, {
  typeKey: '$type'
})

const StoredBan = model<IStoredBan>('Ban', BanSchema)
export default StoredBan

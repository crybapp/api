import { model, Schema } from 'mongoose'

import { IStoredRoom } from '../models/room/defs'

const RoomSchema = new Schema({
  info: {
    id: String,
    createdAt: Number,
    endedAt: Number,

    type: String,
    portal: {
      id: String,
      janusId: Number,
      janusIp: String,

      status: String,
      lastUpdatedAt: String
    },

    owner: String,
    invite: String,
    controller: String
  },
  profile: {
    name: String
  }
}, {
  typeKey: '$type'
})

const StoredRoom = model<IStoredRoom>('Room', RoomSchema)
export default StoredRoom

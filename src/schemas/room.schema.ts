import { Schema, model } from 'mongoose'

import { IStoredRoom } from '../models/room/defs'

const RoomSchema = new Schema({
    info: {
        id: String,
        createdAt: Number,
        endedAt: Number,

        owner: String,
        invite: String,
        
        portal: {
            id: String,

            status: String,
            lastUpdatedAt: String
        },
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

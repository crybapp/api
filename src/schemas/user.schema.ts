import { Schema, model } from 'mongoose'

import { IStoredUser } from '../models/user/defs'

const UserSchema = new Schema({
    info: {
        id: String,
        joinedAt: Number,
        username: String,
        roles: [String],

        room: String
    },
    security: {
        type: String,
        credentials: {
            userId: String,
            scopes: [String],
            accessToken: String,
            refreshToken: String,
            
            email: String,
            password: String
        }
    },
    profile: {
        name: String,
        icon: String
    }
}, {
    typeKey: '$type'
})

const StoredUser = model<IStoredUser>('User', UserSchema)
export default StoredUser

import { RoomResolvable } from '../models/room'
import { extractRoomId } from './helpers.utils'

import StoredUser from '../schemas/user.schema'

export const fetchRoomMemberIds = (room: RoomResolvable) => StoredUser.distinct('info.id', { 'info.room': extractRoomId(room) })
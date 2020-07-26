import { RoomResolvable } from '../models/room'
import StoredUser from '../schemas/user.schema'
import { extractRoomId } from './helpers.utils'


export const fetchRoomMemberIds = (room: RoomResolvable) => StoredUser.distinct('info.id', { 'info.room': extractRoomId(room) })

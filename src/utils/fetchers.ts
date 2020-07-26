import { RoomResolvable } from '../models/room'
import StoredUser from '../models/user/schema'
import { extractRoomId } from './helpers'


export const fetchRoomMemberIds = (room: RoomResolvable) => StoredUser.distinct('info.id', { 'info.room': extractRoomId(room) })

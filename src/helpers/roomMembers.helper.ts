import client from '../config/redis.config'

export async function fetchRedisRoomMemberIds(roomId: string) {
  const rawRoomMembers = await client.hget('room_members', roomId)
  if (!rawRoomMembers)
    return []

  return rawRoomMembers.split(',')
}

export async function setRedisRoomMemberIds(memberIds: string[], roomId: string) {
  await client.hset('room_members', roomId, memberIds.join(','))
}

export async function deleteRedisRoomMemberIds(roomId: string) {
  await client.hdel('room_members', roomId)
}

export async function addRedisRoomMember(memberId: string, roomId: string) {
  const memberIds = await fetchRedisRoomMemberIds(roomId)
  memberIds.push(memberId)

  await setRedisRoomMemberIds(memberIds, roomId)
}

export async function removeRedisRoomMember(memberId: string, roomId: string) {
  const memberIds = await fetchRedisRoomMemberIds(roomId)

  const memberIdIndex = memberIds.indexOf(memberId)
  if (memberIdIndex === -1)
    return

  await setRedisRoomMemberIds(memberIds, roomId)
}

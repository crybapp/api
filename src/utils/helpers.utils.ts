import Message, { MessageResolvable } from '../models/message'

import { InviteResolvable } from '../models/invite'
import { TargetResolvable } from '../models/invite/defs'
import { RoomResolvable } from '../models/room'
import { PortalAllocationStatus } from '../models/room/defs'
import { UserResolvable } from '../models/user'

export const UNALLOCATED_PORTALS_KEYS: PortalAllocationStatus[] = ['waiting', 'requested', 'error', 'closed']

// Extract User id
export const extractUserId = (user: UserResolvable) => (
  user ? (typeof user === 'string' ? user : user.id) : null
  // Extract Target id
)

export const extractTargetId = (target: TargetResolvable) => (
  target ? (typeof target === 'string' ? target : target.id) : null
  // Extract Room id
)

export const extractRoomId = (room: RoomResolvable) => (
  room ? (typeof room === 'string' ? room : room.id) : null
  // Extract Message id
)

export const extractMessageId = (message: MessageResolvable) => (
  message ? (typeof message === 'string' ? message : message.id) : null
  // Extract Invite id
)

export const extractInviteId = (invite: InviteResolvable) => (
  invite ? (typeof invite === 'string' ? invite : invite.id) : null
)

export class GroupedMessage {
  public id: string
  public createdAt: number

  public author: UserResolvable

  public messages: Message[]
  public messageIds: string[]

  constructor(message: Message, author: UserResolvable) {
    this.id = message.id
    this.createdAt = message.createdAt

    this.author = author

    this.messages = [message]
    this.messageIds = [message.id]
  }

  public push(message: Message) {
    this.messages.push(message)
    this.messageIds.push(message.id)
  }
}

export const groupMessages = (messages: Message[]) => {
  if (messages.length === 0)
    return

  const grouped: GroupedMessage[] = []

  let lastGroupedUserId: string = extractUserId(messages[0].author)

  messages.forEach(message => {
    if (grouped.length === 0)
      grouped.push(new GroupedMessage(message, message.author))
    else if (lastGroupedUserId === extractUserId(message.author))
      grouped[grouped.length - 1].push(message)
    else
      grouped.push(new GroupedMessage(message, message.author))

    lastGroupedUserId = extractUserId(message.author)
  })

  return grouped
}

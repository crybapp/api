import Message, { MessageResolvable } from '../models/message'

import { UserResolvable } from '../models/user'
import { RoomResolvable } from '../models/room'
import { InviteResolvable } from '../models/invite'
import { TargetResolvable } from '../models/invite/defs'
import { PortalAllocationStatus } from '../models/room/defs'

export const UNALLOCATED_PORTALS_KEYS: PortalAllocationStatus[] = ['waiting', 'requested', 'error', 'closed']

export const extractUserId = (user: UserResolvable) => user ? (typeof user === 'string' ? user : user.id) : null
export const extractTargetId = (target: TargetResolvable) => target ? (typeof target === 'string' ? target : target.id) : null

export const extractRoomId = (room: RoomResolvable) => room ? (typeof room === 'string' ? room : room.id) : null
export const extractMessageId = (message: MessageResolvable) => message ? (typeof message === 'string' ? message : message.id) : null

export const extractInviteId = (invite: InviteResolvable) => invite ? (typeof invite === 'string' ? invite : invite.id) : null

export class GroupedMessage {
    id: string
    createdAt: number

    author: UserResolvable
    
	messages: Message[]
    messageIds: string[]

    constructor(message: Message, author: UserResolvable) {
        this.id = message.id
        this.createdAt = message.createdAt

        this.author = author
        
        this.messages = [message]
        this.messageIds = [message.id]
    }

    push(message: Message) {
        this.messages.push(message)
        this.messageIds.push(message.id)
    }
}

export const groupMessages = (messages: Message[]) => {
    if(messages.length === 0) return

    let grouped: GroupedMessage[] = [], lastGroupedUserId: string = extractUserId(messages[0].author)

    messages.forEach(message => {
        if(grouped.length === 0)
            grouped.push(new GroupedMessage(message, message.author))
        else if(lastGroupedUserId === extractUserId(message.author))
            grouped[grouped.length - 1].push(message)
        else
            grouped.push(new GroupedMessage(message, message.author))

        lastGroupedUserId = extractUserId(message.author)
    })

    return grouped
}
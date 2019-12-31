import { PortalEventType } from '../../../models/portal/defs'

type WSEventIncomingType = 'PRESENCE_UPDATE' | 'TYPING_UPDATE'
type WSEventIncomingMouseEventType = 'KEY_UP' | 'KEY_DOWN' | 'PASTE_TEXT' | 'MOUSE_MOVE' | 'MOUSE_SCROLL' | 'MOUSE_DOWN' | 'MOUSE_UP'

type WSEventEmittingType = 'APERTURE_CONFIG' | 'ROOM_DESTROY' | 'MESSAGE_CREATE' | 'MESSAGE_DESTROY' | 'TYPING_UPDATE' | 'INVITE_UPDATE' | 'USER_JOIN' | 'USER_UPDATE' | 'USER_LEAVE' | 'OWNER_UPDATE' | 'CONTROLLER_UPDATE' | 'PORTAL_QUEUE_UPDATE'

export type WSEventType = WSEventIncomingType | WSEventIncomingMouseEventType | WSEventEmittingType | PortalEventType

export default interface WSEvent {
	op: number
	d: any
	t?: WSEventType
}

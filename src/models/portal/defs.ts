import WSEvent from '../../server/websocket/models/event'

export type PortalEventType = 'PORTAL_CREATE' | 'PORTAL_OPEN' | 'PORTAL_UPDATE' | 'PORTAL_CLOSE' | 'PORTAL_DESTROY'

export interface PortalEvent extends WSEvent {
    t?: PortalEventType
}
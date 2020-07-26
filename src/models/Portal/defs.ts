export type PortalEventType = 'PORTAL_CREATE' | 'PORTAL_OPEN' | 'PORTAL_UPDATE' | 'PORTAL_CLOSE' | 'PORTAL_DESTROY'

export interface IPortalEvent {
  t?: PortalEventType
}

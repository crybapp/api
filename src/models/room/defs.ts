import { Document } from 'mongoose'

/**
 * open - The portal is connected to a server
 * starting - The portal is being connected to a server
 * in-queue - The room is waiting to be connected with a VM
 * waiting - The room is waiting for the right conditions to be met to request a VM
 * 
 * error - An error occured
 * closed - The portal was closed for one reason or another
 */

export type PortalAllocationStatus = 'open' | 'starting' | 'in-queue' | 'waiting' | 'closed' | 'error'

export interface PortalAllocation {
    id?: string

    status: PortalAllocationStatus
    lastUpdatedAt?: number
}

export default interface IRoom {
    info: {
        id: string
        createdAt: number
        endedAt?: number

        portal: PortalAllocation
        
        owner: string
        controller: string
    }
    profile: {
        name: string
    }
}

export interface IStoredRoom extends IRoom, Document {}

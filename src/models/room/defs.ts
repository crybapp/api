import { Document } from 'mongoose'

export type RoomType = 'vm'

/**
 * open - The portal is open
 * starting - The portal has been created and is now starting
 * creating - The portal is currently being created by the microservice
 * in-queue - The portal is in a queue to be created by the microservice
 * requested - A portal has been requested and is being allocated by the microservice
 * waiting - The room is waiting until the right conditions are met for the microservice to be contacted
 *
 * error - An error occured
 * closed - The portal was closed for one reason or another
 */

export type PortalAllocationStatus = 'waiting' | 'requested' | 'in-queue' | 'creating' | 'starting' | 'open' | 'closed' | 'error'

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

		type: RoomType
		portal?: PortalAllocation

		owner: string
		controller: string
	}
	profile: {
		name: string
	}
}

export interface IStoredRoom extends IRoom, Document { }

import { Document } from 'mongoose'

import User from '../user'
import Room from '../room'

export type TargetResolvable = Room | User | string
export type TargetType = 'room'

export interface IInviteOptions {
	// maxUses?: number
	// expiresAfterFirstUse?: boolean
	code?: string
	random?: boolean
	maxUses: number
	unlimitedUses: boolean
}

export interface IInviteHeaders {
	system: boolean
}

export default interface IInvite {
	info: {
		id: string
		createdAt: number
		createdBy: string

		active: boolean
		system: boolean

		targetId: string
		targetType: TargetType
	},
	data: {
		code: string
		uses: string[]

		options: IInviteOptions
	}
}

export interface IStoredInvite extends IInvite, Document { }

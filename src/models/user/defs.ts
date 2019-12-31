import { Document } from 'mongoose'

export type Role = 'admin' | 'invited'

export type CredentialType = 'regular' | 'discord'

export interface RegularCredentials {
	email: string
	password: string
}

export interface DiscordCredentials {
	userId: string
	accessToken: string
	refreshToken: string
	scopes: string[]
}

export type Credentials = RegularCredentials | DiscordCredentials

export interface Profile {
	name: string
	icon: string
}

export default interface IUser {
	info: {
		id: string
		joinedAt: number
		username: string
		roles: Role[]

		room?: string
		invite?: string
	}
	security: {
		type: CredentialType
		credentials: Credentials
	}
	profile: Profile
}

export interface IStoredUser extends IUser, Document { }

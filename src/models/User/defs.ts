import { Document } from 'mongoose'

export type Role = 'admin' | 'invited'

export type CredentialType = 'regular' | 'discord'

export interface IRegularCredentials {
  email: string
  password: string
}

export interface IDiscordCredentials {
  userId: string
  accessToken: string
  refreshToken: string
  scopes: string[]
}

export type Credentials = IRegularCredentials | IDiscordCredentials

export interface IProfile {
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
  profile: IProfile
}

export interface IStoredUser extends IUser, Document { }

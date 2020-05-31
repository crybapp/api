import { Message } from '@cryb/mesa'

import StoredUser from '../../schemas/user.schema'
import IUser, { IDiscordCredentials, Role } from './defs'

import Room from '../room'
import Ban from './ban'

import { createPortal } from '../../drivers/portals.driver'
import StoredBan from '../../schemas/ban.schema'

import StoredMessage from '../../schemas/message.schema'

import config from '../../config/defaults.js'
import dispatcher from '../../config/dispatcher.config'
import client from '../../config/redis.config'

import { constructAvatar, exchangeRefreshToken, fetchUserProfile } from '../../services/oauth2/discord.service'
import { TooManyMembers, UserNotFound, UserNotInRoom } from '../../utils/errors.utils'
import { fetchRoomMemberIds } from '../../utils/fetchers.utils'
import { generateFlake, signToken } from '../../utils/generate.utils'
import { extractRoomId, extractUserId, UNALLOCATED_PORTALS_KEYS } from '../../utils/helpers.utils'

export type UserResolvable = User | string

export default class User {
  public id: string
  public joinedAt: number
  public username: string

  public roles: Role[]

  public name: string
  public icon: string

  public room?: Room | string

  constructor(json?: IUser) {
    if (!json)
      return

    this.setup(json)
  }

  public async load(id: string) {
    const doc = await StoredUser.findOne({ 'info.id': id })

    if (!doc)
      throw UserNotFound

    this.setup(doc)

    if (this.room)
      await this.fetchRoom()

    return this
  }

  public async findOrCreate(accessToken: string, refreshToken?: string, scopes?: string[]) {
    const {
      id,
      email,
      username: name,
      avatar: avatarHash
    } = await fetchUserProfile(accessToken),
      existing = await StoredUser.findOne({
        $and: [
          {
            'security.type': 'discord'
          },
          {
            'security.credentials.userId': id
          }
        ]
      }),
      avatar = constructAvatar({
        userId: id,
        email, hash:
          avatarHash
      })

    if (existing) {
      this.setup(existing)

      await StoredUser.updateOne({
        'info.id': this.id
      }, {
        $set: {
          'profile.name': name,
          'profile.icon': avatar,

          'security.credentials.email': email,
          'security.credentials.scopes': scopes,
          'security.credentials.accessToken': accessToken,
          'security.credentials.refreshToken': refreshToken
        }
      })

      return this
    }
    const json: IUser = {
      info: {
        id: generateFlake(),
        joinedAt: Date.now(),
        username: name,
        roles: []
      },
      security: {
        type: 'discord',
        credentials: {
          userId: id,
          email,

          scopes,
          accessToken,
          refreshToken
        }
      },
      profile: {
        name,
        icon: avatar
      }
    }

    const stored = new StoredUser(json)
    await stored.save()

    this.setup(json)

    return this
  }

  public async refreshProfile() {
    const { security: { credentials } } = await StoredUser.findOne({ 'info.id': this.id })
  
    const { refreshToken } = (credentials as IDiscordCredentials)
    const { access_token, refresh_token } = await exchangeRefreshToken(refreshToken)
    const { id, username: name, email, avatar: avatarHash } = await fetchUserProfile(access_token)
  
    const icon = constructAvatar({ userId: id, email, hash: avatarHash })

    await StoredUser.updateOne({
      'info.id': this.id
    }, {
      $set: {
        'security.credentials.accessToken': access_token,
        'security.credentials.refreshToken': refresh_token,

        'profile.name': name,
        'profile.icon': icon
      }
    })

    this.name = name
    this.icon = icon

    if (this.room) {
      const message = new Message(0, this, 'USER_UPDATE')
      dispatcher.dispatch(message, await fetchRoomMemberIds(this.room), [this.id])
    }

    return this
  }

  public signToken() {
    const { id } = this
    const token = signToken({ id, type: 'user' })

    return token
  }

  public async fetchRoom() {
    if (!this.room)
      throw UserNotInRoom

    const roomId = extractRoomId(this.room)

    const room = await new Room().load(roomId)
    this.room = room

    return this
  }

  public async fetchBan() {
    const doc = await StoredBan.findOne({
      $and: [
        {
          'info.active': true
        },
        {
          'data.userId': this.id
        }
      ]
    })

    if (!doc)
      return null

    const ban = new Ban(doc)
    return ban
  }

  public async joinRoom(room: Room, isInitialMember: boolean = false) {
    if (!room.members)
      await room.fetchMembers()

    if (room.members && room.members.length >= config.max_room_member_count)
      throw TooManyMembers

    await StoredUser.updateOne({
      'info.id': this.id
    }, {
      $set: {
        'info.room': room.id
      }
    })

    /**
     * The local instance of the room has not been updated for this user,
     * so we will check if there is only 1 member in the room before the update
     */

    if (!isInitialMember &&
      room.members &&
      room.members.length === (config.min_member_portal_creation_count - 1) &&
      UNALLOCATED_PORTALS_KEYS.indexOf(room.portal.status) > -1)
      createPortal(room)

    const message = new Message(0, { ...this, room: undefined }, 'USER_JOIN')
    dispatcher.dispatch(message, await fetchRoomMemberIds(room))

    this.room = room

    return this
  }

  public async leaveRoom() {
    if (typeof this.room === 'string')
      await this.fetchRoom()

    if (typeof this.room === 'string')
      return

    await this.room.fetchMembers()

    /**
     * In this instance, the WebSocket message is sent before the DB
     * update. This is because the client needs to recieve the message
     * that the user has left the room, and any state changes on the
     * client side to handle the room being left needs to be ran
     */
    const memberIndex = (await this.room.fetchMemberIds()).map(({ id }) => id).indexOf(this.id)
    this.room.members.splice(memberIndex, 1)

    if (this.room.members.length === 0)
      await this.room.destroy()
    else {
      const leavingUserIsOwner = this.id === extractUserId(this.room.owner)

      if (leavingUserIsOwner)
        this.room.transferOwnership(this.room.members[0])

      const message = new Message(0, { u: this.id }, 'USER_LEAVE')
      dispatcher.dispatch(message, await fetchRoomMemberIds(this.room))
    }

    await StoredUser.updateOne({
      'info.id': this.id
    }, {
      $unset: {
        'info.room': ''
      }
    })

    client.hset('undelivered_events', this.id, JSON.stringify([]))

    delete this.room

    return this
  }

  public async destroy() {
    if (this.room)
      await this.leaveRoom()

    await StoredUser.deleteOne({
      'info.id': this.id
    })

    await StoredMessage.deleteMany({
      'info.author': this.id
    })
  }

  public setup(json: IUser) {
    this.id = json.info.id
    this.joinedAt = json.info.joinedAt
    this.username = json.info.username

    this.roles = json.info.roles

    this.name = json.profile.name
    this.icon = json.profile.icon

    if (!this.room)
      this.room = json.info.room
  }

  public prepare() {
    return {...this} as User
  }
}

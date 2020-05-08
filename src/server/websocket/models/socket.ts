import { camelCase } from 'lodash'

import WebSocket from 'ws'

import IWSEvent from './event'
import WSMessage from './message'

import Room from '../../../models/room'
import User from '../../../models/user'

import client from '../../../config/redis.config'

import config from '../../../config/defaults'
import { signApertureToken } from '../../../utils/aperture.utils'
import { verifyToken } from '../../../utils/generate.utils'
import { extractUserId, UNALLOCATED_PORTALS_KEYS } from '../../../utils/helpers.utils'
import log from '../../../utils/log.utils'
import { WSLogPrefix } from '../log'

type SocketConfigKey = 'id' | 'type' | 'user' | 'group' | 'authenticated' | 'last_heartbeat_at' | 'last_user_refresh'
const socketKeys: SocketConfigKey[] = ['id', 'type', 'user', 'group', 'authenticated', 'last_heartbeat_at', 'last_user_refresh']

export default class WSSocket {
	public id: string

	public user?: User
	public room?: Room
	public authenticated: boolean = false
	public lastHeartbeatAt: number
	public lastUserRefresh?: Date

	private socket: WebSocket

	constructor(socket: WebSocket) {
		this.socket = socket

		socketKeys.forEach(key => {
			if (socket[key])
				this[camelCase(key)] = socket[key]
		})
	}

	public set(key: SocketConfigKey, value: any, save: boolean = true) {
		this.socket[key] = value
		this[camelCase(key)] = value

		if (save) this.save()
	}

	public save() {
		const { id, authenticated, lastHeartbeatAt } = this

		if (!id)
			return

		client.hset('client_sessions', id, JSON.stringify({ id, authenticated, lastHeartbeatAt }))
	}

	public send = (message: WSMessage) => this.socket.send(JSON.stringify(message.serialize()))

	public authenticate = async (_token: string) => {
		const { id } = verifyToken(_token) as { id: string }

		try {
			const user = await new User().load(id)

			if (!user)
				return

			// Set user
			this.set('user', user)
			this.set('last_user_refresh', new Date())

			// Presence Update
			if (user.room) {
				const { room } = user as { room: Room }

				const message = new WSMessage(0, { u: user.id, presence: 'online' }, 'PRESENCE_UPDATE')
				await message.broadcastRoom(room, [user.id])

				if (room.portal.status !== 'open') {
					room.fetchMembers().then(async ({ members }) => {
						if (
							members.length > (config.min_member_portal_creation_count - 1) &&
							UNALLOCATED_PORTALS_KEYS.indexOf(room.portal.status) > -1
						)
							await room.createPortal()
					})
				} else if (room.portal.id)
					if (room.portal.janusId) {
						const janusMessage = new WSMessage(0, { id: room.portal.janusId, ip: room.portal.janusIp }, 'JANUS_CONFIG')
						await janusMessage.broadcast([ extractUserId(user) ])
					} else {
						const token = signApertureToken(room.portal.id),
							apertureMessage = new WSMessage(0, { ws: process.env.APERTURE_WS_URL, t: token }, 'APERTURE_CONFIG')
						await apertureMessage.broadcast([ extractUserId(user) ])
					}
			}

			// Log update
			log(`Authenticated user ${user.name} (${user.id})`, [WSLogPrefix, { content: 'auth', color: 'GREEN' }], 'CYAN')

			this.sendUndeliverableMessages()
		} catch (error) {
			return this.socket.close(1013)
		}

		const save = false

		this.set('id', id, save)
		this.set('last_heartbeat_at', Date.now(), save)
		this.set('authenticated', true, save)

		try {
			await client.sadd('connected_clients', id)
		} catch (error) {
			console.error(error)
		}

		if (!save)
			this.save()
	}

	public close = (code: number) => this.socket.close(code)

	private sendUndeliverableMessages = async () => {
		try {
			const _undelivered = await client.hget('undelivered_events', this.id)
			let undelivered: IWSEvent[] = []

			if (_undelivered)
				undelivered = JSON.parse(_undelivered)

			undelivered.forEach((event, s) => this.socket.send(JSON.stringify({ ...event, s })))

			client.hset('undelivered_events', this.id, JSON.stringify([]))
		} catch (error) {
			console.error(error)
		}
	}
}

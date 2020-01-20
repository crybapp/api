import WebSocket, { Server } from 'ws'

import IWSEvent from './models/event'
import WSMessage from './models/message'
import WSSocket from './models/socket'

import config from '../../config/defaults'
import client, { createPubSubClient } from '../../config/redis.config'
import log from '../../utils/log.utils'

import { extractRoomId, extractUserId, UNALLOCATED_PORTALS_KEYS } from '../../utils/helpers.utils'
import handleInternalMessage, { IWSInternalEvent } from './handlers/internal'
import handleMessage from './handlers/message'

/**
 * Redis PUB/SUB
 */
const sub = createPubSubClient()

type ConfigKey = 'c_heartbeat_interval' | 'c_reconnect_interval' | 'c_authentication_timeout'
const fetchConfigItem = async (key: ConfigKey) => parseInt(await client.hget('socket_config', key))

export default (wss: Server) => {
	sub.on('message', async (_, data) => {
		try {
			const { message, recipients, sync }: IWSInternalEvent = JSON.parse(data)

			handleInternalMessage(message, recipients, sync, wss)
		} catch (error) {
			console.error('WS Error:', error)
		}
	}).subscribe('ws')

	wss.on('connection', async (ws: WebSocket) => {
		const socket = new WSSocket(ws)

		log('Connection', 'ws', 'CYAN')

		const c_heartbeat_interval = await fetchConfigItem('c_heartbeat_interval') || 10000,
			c_reconnect_interval = await fetchConfigItem('c_reconnect_interval') || 5000,
			c_authentication_timeout = await fetchConfigItem('c_authentication_timeout') || 10000

		// Hello Socket
		const op = 10, d = { c_heartbeat_interval, c_reconnect_interval, c_authentication_timeout }
		socket.send(new WSMessage(op, d))

		const authentication_timeout = setTimeout(() => {
			if (socket.authenticated)
				return

			ws.close(1008)
		}, c_authentication_timeout)

		const maxHeartbeatTries = 3
		let heartbeatTries = 0

		const heartbeat_interval = setInterval(() => {
			if (!socket.authenticated)
				return

			const offset = c_heartbeat_interval * 1.25 // Set the offset (leeway) of the last heartbeat at

			if ((socket.lastHeartbeatAt - Date.now()) > -offset)
				return heartbeatTries = 0 // If there has been a heartbeat update, return and reset the heartbeatTries variable

			// If there have been no heartbeat updates
			heartbeatTries += 1 // Increate heartbeat tries by one
			if (heartbeatTries > maxHeartbeatTries)
				// If there are more heartbeat tries than the maximum allowed heartbeat tries, close the connection
				ws.close(1001)
			else
				// Else, send a new websocket message forcing a hearbeat, attaching the tries and max tries before termination
				socket.send(new WSMessage(1, { tries: heartbeatTries, max: maxHeartbeatTries }))
		}, c_heartbeat_interval)

		ws.on('message', async data => {
			let json: IWSEvent

			try {
				json = JSON.parse(data.toString())
			} catch (error) {
				return ws.close(1007)
			}

			handleMessage(json, socket)
		})

		ws.on('close', async () => {
			clearInterval(heartbeat_interval)
			clearTimeout(authentication_timeout)

			if (socket.id) {
				client.srem('connected_clients', socket.id)
				client.hdel('client_sessions', socket.id)
			}

			log(`Disconnection ${socket.authenticated ? `with id ${socket.id}` : ''}`, 'ws', 'CYAN')

			if (socket.user && socket.user.room) {
				const roomId = extractRoomId(socket.user.room)

				// if(await client.hget('controller', roomId) === socket.id)
				// We can use optimisation here in order to speed up the controller release cycle

				const message = new WSMessage(0, { u: socket.id, presence: 'offline' }, 'PRESENCE_UPDATE')
				message.broadcastRoom(roomId, [socket.id])

				if (typeof socket.user.room === 'string')
					try {
						await socket.user.fetchRoom()
					} catch (error) {
						return
					} // Room doesn't exists

				if (typeof socket.user.room === 'string')
					return

				const { room } = socket.user

				if (extractUserId(room.controller) === socket.user.id)
					room.releaseControl(socket.user)

				if (config.destroy_portal_when_empty) {
					setTimeout(async () =>
						(await room.load(room.id)).fetchOnlineMemberIds().then(({ portal, online }) => {
							if (online.length > 0)
								return

							if (UNALLOCATED_PORTALS_KEYS.indexOf(portal.status) > -1)
								return

							room.destroyPortal()
						}).catch(console.error), config.empty_room_portal_destroy * 1000
					)
				}
			}
		})
	})
}

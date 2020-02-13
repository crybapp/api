import client, { createPubSubClient } from '../../../config/redis.config'

import User from '../../../models/user'
import IWSEvent, { WSEventType } from '../models/event'
import WSMessage from '../models/message'
import WSSocket from '../models/socket'

import { extractRoomId, extractUserId } from '../../../utils/helpers.utils'
import { validateControllerEvent } from '../../../utils/validate.utils'
import logMessage from '../log'

const pub = createPubSubClient(),
	CONTROLLER_EVENT_TYPES: WSEventType[] = [
		'KEY_DOWN',
		'KEY_UP',
		'PASTE_TEXT',
		'MOUSE_MOVE',
		'MOUSE_SCROLL',
		'MOUSE_DOWN',
		'MOUSE_UP'
	]

export default async (message: IWSEvent, socket: WSSocket) => {
	const { op, d, t } = message

	if (process.env.NODE_ENV !== 'production')
		logMessage(message)

	if (op === 0) {
		if (t === 'TYPING_UPDATE') {
			const typingUpdate = new WSMessage(0, { u: socket.user.id, typing: !!d.typing }, 'TYPING_UPDATE')

			typingUpdate.broadcastRoom(socket.user.room, [socket.user.id])
		} else if (CONTROLLER_EVENT_TYPES.indexOf(t) > -1) {
			if (!validateControllerEvent(d, t))
				return

			const currentTimestamp = new Date().getTime()
			const oldTimestamp = socket.lastUserRefresh.getTime()
			const timeDifference = Math.abs(currentTimestamp - oldTimestamp)

			if(timeDifference > 15000) {
				socket.set('user', await new User().load(socket.user.id))
				socket.set('last_user_refresh', new Date())
			}

			if (!socket.user)
				return // Check if the socket is actually authenticated

			if (!socket.user.room)
				return // Check if the user is in a room

			if (typeof socket.user.room === 'string')
				return // Check if room is unreadable

			if (await client.hget('controller', extractRoomId(socket.user.room)) !== extractUserId(socket.user))
				return // Check if the user has the controller

			pub.publish('portals', JSON.stringify({
				op,
				d: {
					t: socket.user.room.portal.id,
					...d
				},
				t
			}))
		}
	} else if (op === 1) { // Heartbeat
		socket.set('last_heartbeat_at', Date.now())
		socket.send(new WSMessage(11, {}))
	} else if (op === 2) { // Identify
		const { token } = d

		socket.authenticate(token)
	}
}

import express from 'express'

import Room from '../models/room'
import StoredRoom from '../schemas/room.schema'

import { PortalAllocationStatus } from '../models/room/defs'
import WSMessage from '../server/websocket/models/message'

import authenticate from '../server/middleware/authenticate.internal.middleware'
import { signApertureToken } from '../utils/aperture.utils'
import { handleError, RoomNotFound } from '../utils/errors.utils'

const app = express()

/**
 * Assign New Portal ID to Room
 */
app.post('/portal', authenticate, async (req, res) => {
	const { id, roomId } = req.body as { id: string, roomId: string }

	try {
		const room = await new Room().load(roomId)
		await room.setPortalId(id)

		res.sendStatus(200)
	} catch (error) {
		handleError(error, res)
	}
})

/**
 * Existing Portal Status Update
 */
app.put('/portal', authenticate, async (req, res) => {
	const { id, status } = req.body as { id: string, status: PortalAllocationStatus }
	// console.log('recieved', id, status, 'from portal microservice, finding room...')

	try {
		const doc = await StoredRoom.findOne({ 'info.portal.id': id })

		if (!doc)
			return RoomNotFound

		// console.log('room found, updating status...')

		const room = new Room(doc)
		const { portal: allocation } = await room.updatePortalAllocation({ status }),
			{ online } = await room.fetchOnlineMemberIds()

		// console.log('status updated and online members fetched:', online)

		if (online.length > 0) {
			/**
			 * Broadcast allocation to all online clients
			 */
			const updateMessage = new WSMessage(0, allocation, 'PORTAL_UPDATE')
			await updateMessage.broadcast(online)

			if (status === 'open') {
				const token = signApertureToken(id),
					apertureMessage = new WSMessage(0, { ws: process.env.APERTURE_WS_URL, t: token }, 'APERTURE_CONFIG')

				await apertureMessage.broadcast(online)
			}
		}

		res.sendStatus(200)
	} catch (error) {
		handleError(error, res)
	}
})

app.post('/queue', authenticate, (req, res) => {
	const { queue } = req.body as { queue: string[] }

	queue.forEach(async (id, i) => {
		try {
			const op = 0, d = { pos: i, len: queue.length }, t = 'PORTAL_QUEUE_UPDATE',
				message = new WSMessage(op, d, t)

			await message.broadcastRoom(id)
		} catch (error) {
			handleError(error, res)
		}
	})

	res.sendStatus(200)
})

export default app

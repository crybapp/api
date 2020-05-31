import axios from 'axios'
import jwt from 'jsonwebtoken'

import Room from '../models/room'

import log from '../utils/log.utils'
import WSMessage from '../server/websocket/models/message'

const url = `${process.env.PORTALS_API_URL}/`, key = process.env.PORTALS_API_KEY

const generateRoomToken = (room: Room) => jwt.sign({ roomId: room.id }, key),
	generateHeaders = async (room: Room) => ({
		Authorization: `Valve ${generateRoomToken(room)}`
	})

export const createPortal = (room: Room) => new Promise(async (resolve, reject) => {
	try {
		const headers = await generateHeaders(room)
		log(`Sending request to ${url}create with room id: ${room.id}`, [{ content: 'portals', color: 'MAGENTA' }])

		const response =  await axios.post(`${url}create`, { roomId: room.id }, { headers })

		const portalQueueMessage = new WSMessage(0, response.data, 'QUEUE_UPDATE')
		portalQueueMessage.broadcastRoom(room)

		resolve()
	} catch (error) {
		console.log(`AXIOS POST FAILED: ${error}`)
		reject(error)
	}
})

export const destroyPortal = (room: Room) => new Promise(async (resolve, reject) => {
	try {
		const headers = await generateHeaders(room),
			{ portal } = room

		if (!portal.id)
			return

		await axios.delete(`${url}${portal.id}`, { headers })

		resolve()
	} catch (error) {
		reject(error)
	}
})

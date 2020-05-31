import { Message as MesaMessage } from '@cryb/mesa'
import axios from 'axios'
import jwt from 'jsonwebtoken'

import dispatcher from '../config/dispatcher.config'

import Room from '../models/room'

import { extractUserId } from '../utils/helpers.utils'
import log from '../utils/log.utils'

const url = `${process.env.PORTALS_API_URL}/`, key = process.env.PORTALS_API_KEY

const generateRoomToken = (room: Room) => jwt.sign({ roomId: room.id }, key),
  generateHeaders = async (room: Room) => ({
    Authorization: `Valve ${generateRoomToken(room)}`
  })

export async function createPortal (room: Room) {
  const headers = await generateHeaders(room)
  log(`Sending request to ${url}create with room id: ${room.id}`, [{ content: 'portals', color: 'MAGENTA' }])

  const response =  await axios.post(`${url}create`, { roomId: room.id }, { headers })

  const portalQueueMessage = new MesaMessage(0, response.data, 'QUEUE_UPDATE')
  dispatcher.dispatch(portalQueueMessage, (await room.fetchMemberIds()).map(extractUserId))
}

export async function destroyPortal(room: Room) {
  const headers = await generateHeaders(room)
  const { portal } = room

  if (!portal.id)
    return

  await axios.delete(`${url}${portal.id}`, { headers })
}

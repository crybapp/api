import { Message as MesaMessage } from '@cryb/mesa'
import axios from 'axios'
import jwt from 'jsonwebtoken'

import dispatcher from '../config/dispatcher'

import Room from '../models/room'

import { extractUserId } from '../utils/helpers'
import log from '../utils/log'

const url = `${process.env.PORTALS_API_URL}/`; const 
  key = process.env.PORTALS_API_KEY

const generateRoomToken = (room: Room) => jwt.sign({ roomId: room.id }, key)
const generateHeaders = async (room: Room) => ({
  Authorization: `Valve ${generateRoomToken(room)}`
})

export const createPortal = (room: Room) => new Promise(async (resolve, reject) => {
  try {
    const headers = await generateHeaders(room)
    log(`Sending request to ${url}create with room id: ${room.id}`, [{ content: 'portals', color: 'MAGENTA' }])

    const response =  await axios.post(`${url}create`, { roomId: room.id }, { headers })

    const portalQueueMessage = new MesaMessage(0, response.data, 'QUEUE_UPDATE')
    dispatcher.dispatch(portalQueueMessage, room.members.map(extractUserId))

    resolve()
  } catch (error) {
    console.log(`AXIOS POST FAILED: ${error}`)
    reject(error)
  }
})

export const destroyPortal = (room: Room) => new Promise(async (resolve, reject) => {
  try {
    const headers = await generateHeaders(room)
    const { portal } = room

    if (!portal.id)
      return

    await axios.delete(`${url}${portal.id}`, { headers })

    resolve()
  } catch (error) {
    reject(error)
  }
})

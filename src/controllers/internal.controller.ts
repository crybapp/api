import express from 'express'

import Room from '../models/room'
import StoredRoom from '../schemas/room.schema'

import { PortalAllocationStatus } from '../models/room/defs'
import WSMessage from '../server/websocket/models/message'

import authenticate from '../server/middleware/authenticate.internal.middleware'
import { handleError, RoomNotFound } from '../utils/errors.utils'

const app = express()

/**
 * Assign New Portal ID to Room
 */
app.post('/portal', authenticate, async (req, res) => {
  const { id, roomId } = req.body as { id: string; roomId: string }

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
  const { id, status, janusId } = req.body as { id: string; status: PortalAllocationStatus; janusId?: number }
  // console.log('recieved', id, status, 'from portal microservice, finding room...')

  try {
    const doc = await StoredRoom.findOne({ 'info.portal.id': id })
    if (!doc)
      return RoomNotFound

    // console.log('room found, updating status...')

    const room = new Room(doc)
    const { portal: allocation } = await room.updatePortalAllocation({ janusId, status }),
      { online } = await room.fetchOnlineMemberIds()

    // console.log('status updated and online members fetched:', online)

    if (online.length > 0) {
      /**
        * Broadcast allocation to all online clients
        */
      const updateMessage = new WSMessage(0, allocation, 'PORTAL_UPDATE')
      await updateMessage.broadcast(online)

      if (status === 'open') {
        const janusMessage = new WSMessage(0, { id: janusId }, 'JANUS_CONFIG')
        await janusMessage.broadcast(online)
      }
    }

    res.sendStatus(200)
  } catch (error) {
    handleError(error, res)
  }
})

app.post('/queue', authenticate, (req, res) => {
  const {
    dequeuedRoomIds,
    currentQueueLength,
    roomIdsInQueue
  } = req.body as {
    dequeuedRoomIds: string[]
    currentQueueLength: number
    lastMovementLength: number
    roomIdsInQueue: string[]
  }

  const dequeuedlength = dequeuedRoomIds.length

  roomIdsInQueue.forEach((roomId, index) => {
    const queueMessage = new WSMessage(0, {
      currentPositionInQueue: index + 1,
      currentQueueLength,
      dequeuedLength: dequeuedlength
    }, 'QUEUE_UPDATE')

    queueMessage.broadcastRoom(roomId)
  })

  res.sendStatus(200)
})

export default app

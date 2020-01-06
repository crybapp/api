import express from 'express'

import Room from '../models/room'
import StoredRoom from '../schemas/room.schema'

import WSMessage from '../server/websocket/models/message'
import { PortalAllocationStatus } from '../models/room/defs'

import { signApertureToken } from '../utils/aperture.utils'
import { handleError, RoomNotFound } from '../utils/errors.utils'
import authenticate from '../server/middleware/authenticate.internal.middleware'

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
    } catch(error) {
        handleError(error, res)
    }
})

/**
 * Existing Portal Status Update
 */
app.put('/portal', authenticate, async (req, res) => {
    const { id, status, janusId, janusIp } = req.body as { id: string, status: PortalAllocationStatus, janusId?: number, janusIp?: string }
    console.log('recieved', id, status, 'from portal microservice, finding room...')

    try {
        const doc = await StoredRoom.findOne({ 'info.portal.id': id })
        if(!doc) return RoomNotFound

        console.log('room found, updating status...')

        const room = new Room(doc)
        const { portal: allocation } = await room.updatePortalAllocation({ janusId, janusIp, status }),
                { online } = await room.fetchOnlineMemberIds()

        console.log('status updated and online members fetched:', online)

        if(online.length > 0) {
            /**
             * Broadcast allocation to all online clients
             */
            const updateMessage = new WSMessage(0, allocation, 'PORTAL_UPDATE')
            updateMessage.broadcast(online)

            if(status === 'open') {
                //JanusId is -1 when a janus instance is not running. 
                if(allocation.janusId == -1) {
                    const token = signApertureToken(id), apertureMessage = new WSMessage(0, { ws: process.env.APERTURE_WS_URL, t: token }, 'APERTURE_CONFIG')
                    apertureMessage.broadcast(online)
                } else {
                    const janusMessage = new WSMessage(0, { id: janusId }, 'JANUS_CONFIG')
                    janusMessage.broadcast(online)
                }
            } 
        }

        res.sendStatus(200)
    } catch(error) {
        handleError(error, res)
    }
})

app.post('/queue', authenticate, (req, res) => {
    const { queue } = req.body as { queue: string[] }

    queue.forEach((id, i) => {
        try {
            const op = 0, d = { pos: i, len: queue.length }, t = 'PORTAL_QUEUE_UPDATE',
                    message = new WSMessage(op, d, t)

            message.broadcastRoom(id)
        } catch(error) {
            console.error(error)
        }
    })

    res.sendStatus(200)
})

export default app

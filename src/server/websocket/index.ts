import WebSocket, { Server } from 'ws'

import Room from '../../models/room'

import WSEvent from './models/event'
import WSSocket from './models/socket'
import WSMessage from './models/message'

import log from '../../utils/log.utils'
import client, { createPubSubClient } from '../../config/redis.config'

import handleMessage from './handlers/message'
import { PortalEvent } from '../../models/portal/defs'
import handleInternalMessage, { WSInternalEvent } from './handlers/internal'
import { extractUserId, extractRoomId, UNALLOCATED_PORTALS_KEYS } from '../../utils/helpers.utils'

/**
 * Redis PUB/SUB
 */
const sub = createPubSubClient()

type ConfigKey = 'c_heartbeat_interval' | 'c_reconnect_interval' | 'c_authentication_timeout'
const fetchConfigItem = async (key: ConfigKey) => parseInt(await client.hget('socket_config', key))

export default (wss: Server) => {
    sub.on('message', async (channel, data) => {
        console.log(channel, data)

        try {
            if(channel === 'ws') {
                const { message, recipients, sync }: WSInternalEvent = JSON.parse(data)

                handleInternalMessage(message, recipients, sync, wss)
            } else if(channel === 'portals') {
                const { op, d, t }: PortalEvent = JSON.parse(data),
                        { status } = d

                const { id, roomId } = d

                const room = await new Room().load(roomId)
                const { portal: allocation } = await room.updatePortalAllocation({ id, status })

                const { online } = await room.fetchOnlineMemberIds()
                handleInternalMessage({ op, d: allocation, t }, online, true, wss)
            } else return console.error(channel, data)
        } catch(error) {
            console.error('WS Error:', error)
        }
    }).subscribe([
        'ws',
        'portals'
    ])

    wss.on('connection', async (ws: WebSocket) => {
        let socket = new WSSocket(ws)

        log('Connection', 'ws', 'CYAN')

        const c_heartbeat_interval = await fetchConfigItem('c_heartbeat_interval') || 10000,
                c_reconnect_interval = await fetchConfigItem('c_reconnect_interval') || 5000,
                c_authentication_timeout = await fetchConfigItem('c_authentication_timeout') || 10000

        // Hello Socket
        const op = 10, d = { c_heartbeat_interval, c_reconnect_interval, c_authentication_timeout }
        socket.send(new WSMessage(op, d))

        const authentication_timeout = setTimeout(() => {
            if(socket.authenticated) return

            ws.close(1008)
        }, c_authentication_timeout)

        const maxHeartbeatTries = 3
        let heartbeatTries = 0

        const heartbeat_interval = setInterval(() => {
            if(!socket.authenticated) return

            const offset = c_heartbeat_interval * 1.25 // Set the offset (leeway) of the last heartbeat at

            if((socket.lastHeartbeatAt - Date.now()) > -offset) return heartbeatTries = 0 // If there has been a heartbeat update, return and reset the heartbeatTries variable

            // If there have been no heartbeat updates
            heartbeatTries += 1 // Increate heartbeat tries by one
            if(heartbeatTries > maxHeartbeatTries) ws.close(1001) // If there are more heartbeat tries than the maximum allowed heartbeat tries, close the connection
            else socket.send(new WSMessage(1, { tries: heartbeatTries, max: maxHeartbeatTries })) // Else, send a new websocket message forcing a hearbeat, attaching the tries and max tries before termination
        }, c_heartbeat_interval)

        ws.on('message', async data => {
            let json: WSEvent

            try {
                json = JSON.parse(data.toString())
            } catch(error) {
                console.error(error)

                return ws.close(1007)
            }

            handleMessage(json, socket)
        })

        ws.on('close', async () => {
            clearInterval(heartbeat_interval)
            clearTimeout(authentication_timeout)

            if(socket.id) {
                client.srem('connected_clients', socket.id)
                client.hdel('client_sessions', socket.id)
            }

            log(`Disconnection ${socket.authenticated ? `with id ${socket.id}` : ''}`, 'ws', 'CYAN')

            if(socket.user && socket.user.room) {
                const roomId = extractRoomId(socket.user.room)

                // if(await client.hget('controller', roomId) === socket.id)
                // We can use optimisation here in order to speed up the controller release cycle

                const message = new WSMessage(0, { u: socket.id, presence: 'offline' }, 'PRESENCE_UPDATE')
                message.broadcastRoom(roomId, [ socket.id ])
            
                if(typeof socket.user.room === 'string') await socket.user.fetchRoom()
                if(typeof socket.user.room === 'string') return

                const { room } = socket.user

                if(extractUserId(room.controller) === socket.user.id)
                    room.releaseControl(socket.user)

                setTimeout(async () =>
                    (await room.load(room.id)).fetchOnlineMemberIds().then(({ portal, online }) => {
                        if(online.length > 0) return
                        if(UNALLOCATED_PORTALS_KEYS.indexOf(portal.status) > -1) return

                        room.destroyPortal()
                    }).catch(console.error)
                , 1000 * 5)
            } else
                socket = null
        })
    })
}
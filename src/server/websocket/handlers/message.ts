import client, { createPubSubClient } from '../../../config/redis.config'

import WSEvent, { WSEventType } from '../models/event'
import WSSocket from '../models/socket'
import WSMessage from '../models/message'

import logMessage from '../log'
import { validateControllerEvent } from '../../../utils/validate.utils'
import { extractRoomId, extractUserId } from '../../../utils/helpers.utils'
import User from '../../../models/user'

const pub = createPubSubClient(),
        CONTROLLER_EVENT_TYPES: WSEventType[] = ['KEY_DOWN', 'KEY_UP', 'PASTE_TEXT', 'MOUSE_MOVE', 'MOUSE_SCROLL', 'MOUSE_DOWN', 'MOUSE_UP']

export default async (message: WSEvent, socket: WSSocket) => {
    const { op, d, t } = message
    logMessage(message)

    if(op === 0) {
        if(t === 'TYPING_UPDATE') {
            const message = new WSMessage(0, { u: socket.user.id, typing: !!d.typing }, 'TYPING_UPDATE')
            message.broadcastRoom(socket.user.room, [ socket.user.id ])
        } else if(CONTROLLER_EVENT_TYPES.indexOf(t) > -1){
            if(!validateControllerEvent(d, t)) return
            
            if(!socket.user) return // Check if the socket is actually authenticated
            if(!socket.user.room) return // Check if the user is in a room
            if(typeof socket.user.room === 'string') return // Check if room is unreadable
            if(await client.hget('controller', extractRoomId(socket.user.room)) !== extractUserId(socket.user)) return // Check if the user has the controller

            if(!socket.user.room.portal.id) {
                socket.set('user', await new User().load(socket.user.id))
            }

            pub.publish('portals', JSON.stringify({
                op,
                d: {
                    t: socket.user.room.portal.id,
                    ...d
                },
                t
            }))
        }
    } else if(op === 1) { // Heartbeat
        socket.set('last_heartbeat_at', Date.now())
        socket.send(new WSMessage(11, {}))
    } else if(op === 2) { // Identify
        const { token } = d

        socket.authenticate(token)
    }
}

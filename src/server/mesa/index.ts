import Mesa, { Message } from '@cryb/mesa'
import http from 'http'

import axios from 'axios'

import config from '../../config/defaults'
import redis, { createPubSubClient, getOptions } from '../../config/redis.config'
import log from '../../utils/log.utils'

import Room from '../../models/room'
import User from '../../models/user'

import { fetchRoomMemberIds } from '../../utils/fetchers.utils'
import { verifyToken } from '../../utils/generate.utils'
import { extractRoomId, extractUserId, UNALLOCATED_PORTALS_KEYS } from '../../utils/helpers.utils'
import { validateControllerEvent } from '../../utils/validate.utils'

const CONTROLLER_EVENT_TYPES = ['KEY_DOWN', 'KEY_UP', 'PASTE_TEXT', 'MOUSE_MOVE', 'MOUSE_SCROLL', 'MOUSE_DOWN', 'MOUSE_UP'],
  pub = createPubSubClient()

export default (server: http.Server) => {
  const mesa = new Mesa({
    server,
    namespace: config.mesa_namespace,
    redis: getOptions(),

    // heartbeat: {
    //   enabled: true,
    //   interval: 10000,
    //   maxAttempts: 3
    // },
    reconnect: {
      enabled: true,
      interval: 5000
    },
    authentication: {
      storeConnectedUsers: true
    }
  })

  mesa.on('connection', client => {
    log('Connection', 'ws', 'CYAN')

    client.authenticate(async ({ token }, done) => {
      let id: string
      let user: User

      try {
        if (process.env.AUTH_BASE_URL) {
          const { data } = await axios.post(process.env.AUTH_BASE_URL, { token })

          user = new User(data)
          id = user.id
        } else {
          id = (verifyToken(token) as { id: string }).id
          user = await new User().load(id)
        }

        mesa.send(
          new Message(0, { u: id, presence: 'online'}, 'PRESENCE_UPDATE'),
          await fetchRoomMemberIds(user.room),
          [id]
        )

        log(`Authenticated ${id}`, 'ws', 'CYAN')

        done(null, { id, user })
      } catch (error) {
        console.error(error)

        done(error, null)
      }
    })

    client.on('message', async message => {
      const { opcode, data, type } = message

      if (type === 'TYPING_UPDATE') {
        mesa.send(
          new Message(0, { u: client.id, typing: !!data.typing }, 'TYPING_UPDATE'),
          await fetchRoomMemberIds(client.user.room),
          [client.id]
        )
      } else if (CONTROLLER_EVENT_TYPES.indexOf(type) > -1) {
        if (!validateControllerEvent(data, type)) return

        if (!client.user)
          return // Check if the socket is actually authenticated

        if (!client.user.room)
          return // Check if the user is in a room

        if (typeof client.user.room === 'string')
          return // Check if room is unreadable

        if (!client.user.room.portal.id)
          client.updateUser({ id: client.id, user: await new User().load(client.user.id) }) // Workaround for controller bug

        if (await redis.hget('controller', extractRoomId(client.user.room)) !== extractUserId(client.user))
          return // Check if the user has the controller

        pub.publish('portals', JSON.stringify({
          op: opcode,
          d: {
            t: client.user.room.portal.id,
            ...data
          },
          t: type
        }))
      }
    })

    client.on('disconnect', async (code, reason) => {
      log(`Disconnection ${client.authenticated ? `with id ${client.id}` : ''} code: ${code}, reason: ${reason}`, 'ws', 'CYAN')

      if (client.authenticated && client.user.room) {
        // if (await redis.hget('controller', roomId) === client.id)

        // We can use optimisation here in order to speed up the controller release cycle

        const message = new Message(0, { u: client.id, presence: 'offline' }, 'PRESENCE_UPDATE')
        mesa.send(message, await fetchRoomMemberIds(client.user.room))

        if (typeof client.user.room === 'string') {
          try {
            await client.user.fetchRoom()
          } catch (error) {
            return
          } // Room doesn't exists
        }

        if (typeof client.user.room === 'string')
          return

        const { room } = client.user as { room: Room }

        if (extractUserId(room.controller) === client.user.id)
          room.releaseControl(client.user)

        if (config.destroy_portal_when_empty) {
          setTimeout(async () =>
            (await room.load(room.id)).fetchOnlineMemberIds().then(({ portal, online }) => {
              if (online.length > 0) return
              if (UNALLOCATED_PORTALS_KEYS.indexOf(portal.status) > -1) return

              room.destroyPortal()
            }).catch (console.error), config.empty_room_portal_destroy * 1000
          )
        }
      }
    })
  })
}

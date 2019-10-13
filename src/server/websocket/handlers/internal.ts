import { Server } from 'ws'

import WSEvent from '../models/event'

import logMessage from '../log'

export interface WSInternalEvent {
    message: WSEvent
    recipients: string[]
    sync: boolean
}

export default (message: WSEvent, recipients: string[], sync: boolean, wss: Server) => {
    if(recipients.length === 0) return
    logMessage(message, recipients)

    let delivered = []

    // TODO: Sync for clients not on ws when event is global
    if(recipients[0] === '*')
        return wss.clients.forEach(client => client.send(JSON.stringify(message)))
    else
        Array.from(wss.clients)
            .filter(client => recipients.indexOf(client['id']) > -1)
            .forEach(client => {
                delivered.push(client['id'])
                client.send(JSON.stringify(message))
            })
}
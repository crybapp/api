import { Server } from 'ws'

import IWSEvent from '../models/event'

import logMessage from '../log'

export interface IWSInternalEvent {
	message: IWSEvent
	recipients: string[]
	sync: boolean
}

export default (message: IWSEvent, recipients: string[], _: boolean, wss: Server) => {
	if (recipients.length === 0)
		return

	if (process.env.NODE_ENV !== 'production')
		logMessage(message, recipients)

	const delivered = []

	// TODO: Sync for clients not on ws when event is global
	if (recipients[0] === '*')
		return wss.clients.forEach(client => client.send(JSON.stringify(message)))
	else
		Array.from(wss.clients)
			.filter(client => recipients.indexOf(client['id']) > -1)
			.forEach(client => {
				delivered.push(client['id'])
				client.send(JSON.stringify(message))
			})
}

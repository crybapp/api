import IWSEvent, { WSEventType } from '../models/event'

import client from '../../../config/redis.config'

const DISALLOWED_UNDELIVERABLE_EVENT_TYPES: WSEventType[] = [
	'PRESENCE_UPDATE',
	'TYPING_UPDATE'
]

export default (message: IWSEvent, recipients: string[]) => {
	if (DISALLOWED_UNDELIVERABLE_EVENT_TYPES.indexOf(message.t) > -1)
		return

	recipients.forEach(async id => {
		if (!id)
			return

		try {
			const _undelivered = await client.hget('undelivered_events', id)
			let undelivered: IWSEvent[] = []

			if (_undelivered)
				undelivered = JSON.parse(_undelivered)

			undelivered.splice(0, 0, message)

			await client.hset('undelivered_events', id, JSON.stringify(undelivered))
		} catch (error) {
			console.error(error)
		}
	})
}

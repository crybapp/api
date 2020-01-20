import express from 'express'

import Invite from '../models/invite'
import User from '../models/user'

import { authenticate } from '../config/passport.config'
import { handleError, UserNotInRoom } from '../utils/errors.utils'

const app = express()

app.post('/', authenticate, async (req, res) => {
	const { user } = req as { user: User }

	if (!user.room)
		return handleError(UserNotInRoom, res)

	try {
		const invite = await new Invite().create(null, 'room', null, { system: false }, req.user)

		res.send(invite)
	} catch (error) {
		handleError(error, res)
	}
})

app.post('/:code', authenticate, async (req, res) => {
	const { user } = req as { user: User },
		{ code } = req.params,
		{ type } = req.body

	try {
		const invite = await new Invite().findFromCode(code),
			target = await invite.use(user, type)

		if (!target)
			return res.sendStatus(200)

		res.send(target)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/:code/peek', async (req, res) => {
	const { code } = req.params

	try {
		const invite = await new Invite().findFromCode(code),
			{ target } = await invite.fetchTarget()

		if (!target)
			return res.sendStatus(401)

		res.send(target)
	} catch (error) {
		handleError(error, res)
	}
})

export default app

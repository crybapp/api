import express from 'express'

import User from '../models/user'
import Room from '../models/room'
import Report from '../models/report'
import Message from '../models/message'

import { extractUserId } from '../utils/helpers.utils'
import { authenticate } from '../config/passport.config'
import { handleError, UserNotInRoom, MessageTooShort, MessageTooLong } from '../utils/errors.utils'

const app = express()

app.post('/', authenticate, async (req, res) => {
    const { user } = req as { user: User }
    if(!user.room) return handleError(UserNotInRoom, res)

    const { content } = req.body
    if(content.length === 0) return handleError(MessageTooShort, res)
    if(content.length >= 255) return handleError(MessageTooLong, res)

    try {
        const message = await new Message().create(content, user)

        res.send(message)
    } catch(error) {
        handleError(error, res)
    }
})

app.post('/:id/report', authenticate, async (req, res) => {
    const { user } = req as { user: User }
    const { id: messageId } = req.params

    try {
        await new Report().create(messageId, user.room, user)

        res.sendStatus(200)
    } catch(error) {
        handleError(error, res)
    }
})

app.delete('/:id', authenticate, async (req, res) => {
    const { user } = req as { user: User }
    const { id: messageId } = req.params

    try {
        if(typeof user.room === 'string')
            await user.fetchRoom()

        const message = await new Message().load(messageId)

        if(extractUserId(message.author) !== user.id && extractUserId((user.room as Room).owner) !== user.id)
            return res.sendStatus(401)

        await message.destroy(req.user)

        res.sendStatus(200)
    } catch(error) {
        handleError(error, res)
    }
})

export default app

import express from 'express'

import User from '../models/user'
import Room from '../models/room'

import { handleError } from '../utils/errors.utils'
import { authenticate } from '../config/passport.config'

const app = express()

app.post('/take', authenticate, async (req, res) => {
    const { user } = req as { user: User }

    try {
        const { room } = await user.fetchRoom() as { room: Room }
        await room.takeControl(user)

        res.sendStatus(200)
    } catch(error) {
        handleError(error, res)
    }
})

app.post('/give/:id', authenticate, async (req, res) => {
    const { user } = req as { user: User }
    const { id: toId } = req.params

    try {
        const { room } = await user.fetchRoom() as { room: Room }
        await room.giveControl(toId, user)

        res.sendStatus(200)
    } catch(error) {
        handleError(error, res)
    }
})

app.post('/release', authenticate, async (req, res) => {
    const { user } = req as { user: User }

    try {
        const { room } = await user.fetchRoom() as { room: Room }
        await room.releaseControl(user)

        res.sendStatus(200)
    } catch(error) {
        handleError(error, res)
    }
})

export default app

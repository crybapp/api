import express from 'express'

import Message from '../models/message'
import Report from '../models/report'
import Room from '../models/room'
import Settings from '../models/settings'
import User from '../models/user'
import Ban from '../models/user/ban'

import StoredBan from '../schemas/ban.schema'
import StoredMessage from '../schemas/message.schema'
import StoredReport from '../schemas/report.schema'
import StoredRoom from '../schemas/room.schema'
import StoredUser from '../schemas/user.schema'

import ISettings from '../models/settings/defs'

import { authenticate } from '../config/passport.config'
import client from '../config/redis.config'
import { handleError } from '../utils/errors.utils'

const app = express()

app.get('/auth', authenticate, (req, res) => res.send(req.user))

app.get('/rooms', authenticate, async (req, res) => {
	const { index } = req.query

	try {
		const docs = await StoredRoom.find({}).sort({ 'info.createdAt': -1 }).skip(parseInt(index) || 0).limit(10)
		if (docs.length === 0) return res.send([])

		const rooms = docs.map(doc => new Room(doc))

		for (let i = 0; i < rooms.length; i++)
			await rooms[i].fetchMembers()

		res.send(rooms)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/users', authenticate, async (req, res) => {
	const { index } = req.query

	try {
		const docs = await StoredUser.find({}).sort({ 'info.joinedAt': -1 }).skip(parseInt(index) || 0).limit(10)
		if (docs.length === 0) return res.send([])

		const users = docs.map(doc => new User(doc))

		for (let i = 0; i < users.length; i++)
			if (users[i].room)
				await users[i].fetchRoom().catch(console.error)

		res.send(users)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/room/:id', authenticate, async (req, res) => {
	const { id: roomId } = req.params

	try {
		const room = await new Room().load(roomId)

		await room.fetchInvites()
		await room.fetchMembers()
		await room.fetchMessages()
		await room.fetchOnlineMemberIds()

		res.send(room)
	} catch (error) {
		handleError(error, res)
	}
})

app.delete('/room/:id', authenticate, async (req, res) => {
	const { id: roomId } = req.params

	try {
		const room = await new Room().load(roomId)
		await room.destroy()

		res.sendStatus(200)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/room/:id/messages', authenticate, async (req, res) => {
	const { id: roomId } = req.params
	const { index } = req.query

	try {
		const docs = await StoredMessage.find({ 'info.room': roomId }).sort({ 'info.createdAt': -1 }).skip(index).limit(10)
		if (docs.length === 0) return res.send([])

		const messages = docs.map(doc => new Message(doc))
		res.send(messages)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/user/:id', authenticate, async (req, res) => {
	const { id: userId } = req.params

	try {
		const user = await new User().load(userId)
		await user.fetchRoom().catch(console.error)

		res.send(user)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/settings', authenticate, async (_, res) => {
	try {
		const settings = await client.hgetall('settings') as ISettings

		res.send(settings)
	} catch (error) {
		handleError(error, res)
	}
})

app.patch('/settings', authenticate, async (req, res) => {
	const { body: update } = req

	try {
		const updated = await new Settings().patch(update)

		res.send(updated)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/bans', authenticate, async (req, res) => {
	const { index } = req.query

	try {
		const docs = await StoredBan.find({
			'info.active': true
		}).sort({
			'info.createdAt': -1
		}).skip(parseInt(index) || 0).limit(10)
		if (docs.length === 0) return res.send([])

		const bans = docs.map(doc => new Ban(doc))
		res.send(bans)
	} catch (error) {
		handleError(error, res)
	}
})

app.post('/ban', authenticate, async (req, res) => {
	const { id: userId, reason } = req.body

	try {
		const ban = await new Ban().create(userId, reason, req.user)

		res.send(ban)
	} catch (error) {
		handleError(error, res)
	}
})

app.delete('/ban/:id', authenticate, async (req, res) => {
	const { id: banId } = req.params

	try {
		const ban = await new Ban().load(banId)
		await ban.setActive(false)

		res.sendStatus(200)
	} catch (error) {
		handleError(error, res)
	}
})

app.get('/messages/reported', authenticate, async (req, res) => {
	const { index } = req.query

	try {
		const docs = await StoredReport.find({}).sort({ 'info.createdAt': -1 }).skip(parseInt(index) || 0).limit(10)
		if (docs.length === 0) return res.send([])

		const reports = docs.map(doc => new Report(doc))
		res.send(reports)
	} catch (error) {
		handleError(error, res)
	}
})

export default app

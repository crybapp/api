import express from 'express'

import Room from '../models/room'
import User from '../models/user'

import config from '../config/defaults'

import { RoomType } from '../models/room/defs'

import { authenticate } from '../config/passport.config'
import {
  handleError, RoomNameTooLong, RoomNameTooShort,
  UserAlreadyInRoom, UserNotAuthorized, UserNotInRoom
} from '../utils/errors.utils'
import { extractRoomId, extractUserId } from '../utils/helpers.utils'

const app = express(),
  AVAILABLE_TYPES: RoomType[] = ['vm']

app.get('/', authenticate, async (req, res) => {
  const { user } = req as { user: User }

  if (!user.room)
    return handleError(UserNotInRoom, res)

  const roomId = extractRoomId(user.room)

  try {
    const room = await new Room().load(roomId)

    await room.fetchMembers()
    await room.fetchMessages()
    await room.fetchOnlineMemberIds()

    const ownerId = extractUserId(room.owner)

    if (ownerId === user.id)
      await room.fetchInvites()

    res.send(room.prepare())
  } catch (error) {
    handleError(error, res)
  }
})

app.post('/', authenticate, async (req, res) => {
  const { user } = req as { user: User }

  if (user.room)
    return handleError(UserAlreadyInRoom, res)

  if (config.room_whitelist && !config.allowed_user_ids.includes(user.id))
    return handleError(UserNotAuthorized, res)

  const { name } = req.body

  if (name.length === 0)
    return handleError(RoomNameTooShort, res)

  if (name.length >= 30)
    return handleError(RoomNameTooLong, res)

  try {
    const room = await new Room().create(name, user)

    res.send(room)
  } catch (error) {
    handleError(error, res)
  }
})

app.delete('/', authenticate, async (req, res) => {
  const { user } = req as { user: User }

  if (!user.room)
    return handleError(UserNotInRoom, res)

  try {
    const { room } = await user.fetchRoom() as { room: Room }

    if (extractUserId(room.owner) !== extractUserId(user))
      return res.sendStatus(401)

    await room.destroy()

    res.sendStatus(200)
  } catch (error) {
    handleError(error, res)
  }
})

app.post('/portal/restart', authenticate, async (req, res) => {
  const { user } = req as { user: User }

  if (!user.room)
    return handleError(UserNotInRoom, res)

  if (typeof user.room === 'string')
    return res.status(500)

  if (extractUserId(user.room.owner) !== user.id)
    return res.status(401)

  try {
    await user.room.restartPortal()

    res.sendStatus(200)
  } catch (error) {
    handleError(error, res)
  }
})

app.get('/invites', authenticate, async (req, res) => {
  const { user } = req as { user: User }

  if (!user.room)
    return handleError(UserNotInRoom, res)

  if (typeof user.room === 'string')
    return res.status(500)

  if (extractUserId(user.room.owner) !== user.id)
    return res.status(401)

  try {
    const { invites } = await user.room.fetchInvites()

    res.send(invites)
  } catch (error) {
    handleError(error, res)
  }
})

app.post('/invite/refresh', authenticate, async (req, res) => {
  const { user } = req as { user: User }

  if (!user.room)
    return handleError(UserNotInRoom, res)

  if (typeof user.room === 'string')
    return res.status(500)

  if (extractUserId(user.room.owner) !== user.id)
    return res.status(401)

  try {
    const invite = await user.room.refreshInvites(req.user, false)

    res.send(invite)
  } catch (error) {
    handleError(error, res)
  }
})

app.post('/leave', authenticate, async (req, res) => {
  const { user } = req as { user: User }

  if (!user.room)
    return handleError(UserNotInRoom, res)

  try {
    await user.leaveRoom()

    res.sendStatus(200)
  } catch (error) {
    handleError(error, res)
  }
})

app.patch('/type', authenticate, async (req, res) => {
  const { user } = req as { user: User }, { type } = req.body as { type: RoomType }

  if (!user.room)
    return handleError(UserNotInRoom, res)

  if (typeof user.room === 'string')
    return res.status(500)

  if (extractUserId(user.room.owner) !== user.id)
    return res.status(401)

  if (AVAILABLE_TYPES.indexOf(type) === -1)
    return res.status(406)

  try {
    await user.room.updateType(type)

    res.sendStatus(200)
  } catch (error) {
    handleError(error, res)
  }
})

import ControllerController from './controller.controller'
import MemberController from './member.controller'
import MessageController from './message.controller'

app.use('/member', MemberController)
app.use('/message', MessageController)
app.use('/controller', ControllerController)

export default app

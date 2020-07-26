import express from 'express'
import queryString from 'query-string'

import User from '../models/user'

import fetchDiscordTokens, { DISCORD_OAUTH_BASE_URL, DISCORD_OAUTH_SCOPES } from '../services/oauth2/discord'
import { handleError } from '../utils/errors'

const app = express()
const origins = process.env.DISCORD_OAUTH_ORIGINS.split(',')

app.post('/discord', async (req, res) => {
  if (!origins.includes(req.get('origin')))
    return res.sendStatus(401)

  const { code } = req.body

  try {
    const { access_token, refresh_token, scope } = await fetchDiscordTokens(code)
    const user = await new User().findOrCreate(access_token, refresh_token, scope.split(' '))
    const token = await user.signToken()

    res.send(token)
  } catch (error) {
    handleError(error, res)
  }
})

app.get('/discord/redirect', async (req, res) => {
  let state = ''

  if (req.query.invite)
    state += `invite=${req.query.invite}`

  const _params = {
    response_type: 'code',
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_CALLBACK_URL,
    scope: DISCORD_OAUTH_SCOPES.join(' '),

    state: null
  }

  if (state !== '')
    _params.state = state

  const params = queryString.stringify(_params)
  res.send(`${DISCORD_OAUTH_BASE_URL}?${params}`)
})

export default app

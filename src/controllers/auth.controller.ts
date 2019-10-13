import express from 'express'
import queryString from 'query-string'

import User from '../models/user'

import { handleError } from '../utils/errors.utils'
import fetchDiscordTokens, { DISCORD_OAUTH_SCOPES, DISCORD_OAUTH_BASE_URL } from '../services/oauth2/discord.service'

const app = express()

const origins = [ 'https://cryb.app', 'https://www.cryb.app', 'https://genesis.cryb.app' ]
if(process.env.NODE_ENV === 'development') origins.push('http://localhost:3000')

app.post('/discord', async (req, res) => {
    console.log(`New login from origin ${req.get('origin')}`)
    if(origins.indexOf(req.get('origin')) === -1) return res.sendStatus(401)

    const { code } = req.body

    try {
        const { access_token, refresh_token, scope } = await fetchDiscordTokens(code),
        user = await new User().findOrCreate(access_token, refresh_token, scope.split(' ')),
                token = await user.signToken()

        res.send(token)
    } catch(error) {
        handleError(error, res)
    }
})

app.get('/discord/redirect', async (req, res) => {
    let state = ''
    if(req.query.invite) state += `invite=${req.query.invite}`

    let _params = {
        response_type: 'code',
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_CALLBACK_URL,
        scope: DISCORD_OAUTH_SCOPES.join(' ')
    }
    if(state !== '') _params['state'] = state

    const params = queryString.stringify(_params)
    res.send(`${DISCORD_OAUTH_BASE_URL}?${params}`)
})

export default app
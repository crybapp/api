import dotenv from 'dotenv'
dotenv.config()

import { createServer } from 'http'

import cors from 'cors'
import express, { json } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import Mesa from '@cryb/mesa'

import { connect } from 'mongoose'

import routes from './routes'
import websocket from './websocket'

import passport from '../config/passport.config'
import { getOptions } from '../config/redis.config'
import { verify_env } from '../utils/verifications.utils'

verify_env(
	'JWT_KEY',
	'PORTALS_API_URL',
	'PORTALS_API_KEY',
	'APERTURE_WS_URL',
	'APERTURE_WS_KEY',
	'MONGO_URI',
	'DISCORD_CLIENT_ID',
	'DISCORD_CLIENT_SECRET',
	'DISCORD_CALLBACK_URL',
	'DISCORD_OAUTH_ORIGINS'
)

const app = express()
const server = createServer(app)
const mesa = new Mesa({
	server,
	namespace: 'api',
	redis: getOptions(),

	heartbeat: {
		enabled: true,
		interval: 10000,
		maxAttempts: 3
	},
	reconnect: {
		enabled: true,
		interval: 5000
	}
})

connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

app.use(helmet())

app.use(cors())
app.use(json())
app.use(morgan('dev'))
app.use(passport.initialize())

routes(app)
websocket(mesa)

export default server

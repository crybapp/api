import dotenv from 'dotenv'
dotenv.config()

import { createServer } from 'http'

import Mesa from '@cryb/mesa'
import express, { json } from 'express'
import { connect } from 'mongoose'

import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import mesa from './mesa'
import routes from './routes'

import config from '../config/defaults'
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

connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

app.use(helmet())

app.use(cors())
app.use(json())
app.use(morgan('dev'))
app.use(passport.initialize())

routes(app)
mesa(app)

export default server

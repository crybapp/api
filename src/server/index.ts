require('dotenv').config()

import { createServer } from 'http'

import express, { json } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { Server } from 'ws'
import cors from 'cors'

import { connect } from 'mongoose'

import routes from './routes'
import websocket from './websocket'

import passport from '../config/passport.config'

const app = express()
const server = createServer(app)
const wss = new Server({ server })

connect(process.env.MONGO_URI, { useNewUrlParser: true })

app.use(helmet())

app.use(cors())
app.use(json())
app.use(morgan('dev'))
app.use(passport.initialize())

routes(app)
websocket(wss)

export default server
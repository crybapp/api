import passport from 'passport'
import { Strategy, ExtractJwt } from 'passport-jwt'
import { Request, Response, NextFunction } from 'express'

import User from '../models/user'

import { handleError, UserNoAuth } from '../utils/errors.utils'

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((id, done) => done(null, id))

passport.use(new Strategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_KEY
}, async ({ id }, done) => {
    try {
        const user = await new User().load(id)

        return done(null, user)
    } catch(error) {
        done(error)
    }
}))

const BAN_SAFE_ENDPOINTS = [
    'GET /user/me'
]

const fetchEndpoint = (req: Request) => `${req.method} ${req.baseUrl}${req.route.path}`

export const authenticate = (req: Request, res: Response, next: NextFunction) =>
    passport.authenticate('jwt', { session: false }, async (err, user: User) => {
        if(err) return res.sendStatus(500)
        if(!user) return res.sendStatus(401)

        const endpoint = fetchEndpoint(req)

        const ban = await user.fetchBan()
        if(ban && BAN_SAFE_ENDPOINTS.indexOf(endpoint) > -1)
            return handleError('UserBanned', res)

        if(req.baseUrl === '/admin' && user.roles.indexOf('admin') === -1)
            return handleError(UserNoAuth, res)

        req.user = user

        next()
    })(req, res, next)

export default passport
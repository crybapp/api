import axios from 'axios'
import { NextFunction, Request, Response } from 'express'
import passport from 'passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import User from '../models/user'

import { handleError, UserBanned, UserNoAuth, UserNotAllowed } from '../utils/errors.utils'

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((id, done) => done(null, id))

passport.use(new Strategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_KEY
}, async ({ id }, done) => {
  const noSessionResponses = ['USER_NO_AUTH', 'USER_NOT_FOUND']

  try {
    const user = await new User().load(id)

    return done(null, user)
  } catch (error) {
    if (error.response && error.response.indexOf(noSessionResponses))
      return done(UserNoAuth)

    done(error)
  }
}))

const BAN_SAFE_ENDPOINTS = [
  'GET /user/me'
]

const fetchEndpoint = (req: Request) => `${req.method} ${req.baseUrl}${req.route.path}`

const fetchUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => new Promise<User>(async (resolve, reject) => {
  try {
    if (process.env.AUTH_BASE_URL) {
      const { authorization } = req.headers,
        token = authorization.split(' ')[1],
        { data: { resource } } = await axios.post(process.env.AUTH_BASE_URL, { token }),
        user = new User(resource)

      resolve(user)
    } else {
      passport.authenticate('jwt', { session: false }, (err, user: User) => {
        if (err)
          return handleError(err, res)

        if (!user)
          return handleError(UserNoAuth, res)

        resolve(user)
      })(req, res, next)
    }
  } catch (error) {
    reject(error)
  }
})

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await fetchUser(req, res, next),
      endpoint = fetchEndpoint(req),
      ban = await user.fetchBan()

    if (ban && BAN_SAFE_ENDPOINTS.includes(endpoint))
      return handleError(UserBanned, res)

    if (req.baseUrl === '/admin' && !user.roles.includes('admin'))
      return handleError(UserNotAllowed, res)

    req.user = user

    next()
  } catch (error) {
    handleError(error, res)
  }
}

export default passport

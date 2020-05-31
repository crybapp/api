import { NextFunction, Request, Response } from 'express'

import { verify } from 'jsonwebtoken'

export default async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers
  if(!authorization)
    return res.sendStatus(401)

  const token = authorization.split(' ')[1]
  if(!token)
    return res.sendStatus(401)

  const payload = verify(token, process.env.PORTALS_API_KEY)
  if(!payload)
    return res.sendStatus(401)

  next()
}

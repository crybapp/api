/* eslint-disable @typescript-eslint/no-var-requires */

import { Application } from 'express'

export default (app: Application) => {
  app.use('/auth', require('../controllers/auth').default)

  // app.use('/admin', require('../controllers/admin').default)
  app.use('/internal', require('../controllers/internal').default)

  app.use('/user', require('../controllers/user').default)
  app.use('/room', require('../controllers/room').default)
  app.use('/invite', require('../controllers/invite').default)

  app.use('/internal', require('../controllers/internal').default)
}

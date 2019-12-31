import { Application } from 'express'

export default (app: Application) => {
		app.use('/auth', require('../controllers/auth.controller').default)

		app.use('/admin', require('../controllers/admin.controller').default)
		app.use('/internal', require('../controllers/internal.controller').default)

		app.use('/user', require('../controllers/user.controller').default)
		app.use('/room', require('../controllers/room.controller').default)

		app.use('/invite', require('../controllers/invite.controller').default)
}

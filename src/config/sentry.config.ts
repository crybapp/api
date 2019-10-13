import * as Sentry from '@sentry/node'

const { SENTRY_DSN: dsn } = process.env

if(process.env.NODE_ENV !== 'development')
    Sentry.init({ dsn })

export default Sentry
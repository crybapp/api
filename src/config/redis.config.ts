import { URL } from 'url'
import Redis from 'ioredis'

interface ISentinel {
  host: string;
  port: number;
}

const parseSentinels = (sentinels: string) =>
  sentinels.split(',').map(uri => ({
    host: uri.split(':')[1].replace('//', ''),
    port: parseInt(uri.split(':')[2])
  } as ISentinel)) // Parse sentinels from process env

export const getOptions = () => { // Get Options Method
  if (!process.env.REDIS_URI && !process.env.REDIS_SENTINELS)
    throw new Error('No value was found for REDIS_URI or REDIS_SENTINELS - make sure .env is setup correctly!')

  if (process.env.REDIS_SENTINELS) {
    return {
      sentinels: parseSentinels(process.env.REDIS_SENTINELS),
      name: 'mymaster'
    } as Redis.RedisOptions
  }

  if (process.env.REDIS_URI) {
    const uri = new URL(process.env.REDIS_URI)

    return {
      host: uri.hostname || 'localhost',
      port: parseInt(uri.port) || 6379,
      db: parseInt(uri.pathname) || 0,
      password: uri.password ? decodeURIComponent(uri.password) : null
    } as Redis.RedisOptions
  }
}

export const createPubSubClient = () => new Redis(getOptions())

export default new Redis(getOptions())

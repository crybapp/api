import Redis from 'ioredis'

interface Sentinel {
    host: string
    port: number
}

const parseSentinels = (sentinels: string) =>
        sentinels.split(',').map(uri => ({
            host: uri.split(':')[1].replace('//', ''),
            port: parseInt(uri.split(':')[2])
        } as Sentinel)), // Parse sentinels from process env
        getOptions = () => { // Get Options Method
            if(process.env.NODE_ENV === 'development' || !process.env.REDIS_SENTINELS)
                return {
                    host: 'localhost',
                    port: 6379,
                    connectTimeout: 2000
                } as Redis.RedisOptions

            return { sentinels: parseSentinels(process.env.REDIS_SENTINELS), name: 'mymaster' } as Redis.RedisOptions
        }

export const createPubSubClient = () => new Redis(getOptions())

export default new Redis(getOptions())
import ISettings from './defs'

import client from '../../config/redis.config'

export default class Settings {
  public async patch(update: ISettings) {
    const current = await client.hgetall('settings') as ISettings

    Object.keys(update).forEach(key => {
      if (!update[key])
        return

      current[key] = update[key]
    })

    const keys = Object.keys(current).filter(key => !!key)
    for (let i = 0; i < keys.length; i++)
      await client.hset('settings', keys[i], current[keys[i]])

    return current
  }
}

import { Dispatcher } from '@cryb/mesa'
import { getOptions } from './redis.config'

export default new Dispatcher(getOptions())

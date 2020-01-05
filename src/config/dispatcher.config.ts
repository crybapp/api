import { Dispatcher } from '@cryb/mesa'

import config from '../config/defaults'
import { getOptions } from './redis.config'

export default new Dispatcher(getOptions(), { namespace: config.mesa_namespace })

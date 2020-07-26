import { Dispatcher } from '@cryb/mesa'

import config from './defaults'
import { getOptions } from './redis'

export default new Dispatcher(getOptions(), { namespace: config.mesa_namespace })

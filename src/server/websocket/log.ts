import { cloneDeep } from 'lodash'

import WSEvent from './models/event'

import log, { LogPrefix } from '../../utils/log.utils'

export const WSLogPrefix: LogPrefix = {
    content: 'ws',
    color: 'CYAN'
}

export default (message: WSEvent, recipients?: string[]) => {
    const { op, d, t } = cloneDeep(message)

    let logline = `Opcode: ${op}, `

    if(t)
        logline += `type: ${t}, `

    logline += `data: `

    if(d['token'] && process.env.NODE_ENV === 'production')
        d['token'] = 'redacted'

    logline += `${JSON.stringify(d)}`

    if(recipients)
        if(recipients.length < 10)
            logline += ` to ${JSON.stringify(recipients)}`
        else
            logline += ` to ${recipients.length} recipients`

    log(logline, [ WSLogPrefix, { content: recipients ? 'emit' : 'recieve', color: 'MAGENTA' } ])
}
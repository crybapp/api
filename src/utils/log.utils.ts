export const colors: {
  [key in LogColor]: string
} = {
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  RESET: '\x1b[0m'
}

type LogColor = 'BLACK' | 'RED' | 'GREEN' | 'YELLOW' | 'BLUE' | 'MAGENTA' | 'CYAN' | 'WHITE' | 'RESET'

export const logColors: LogColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE', 'MAGENTA', 'CYAN']

export interface ILogPrefix {
  content: string
  color?: LogColor
}

export default (msg: string, prefixes: ILogPrefix[] | string, color: LogColor = 'GREEN') => {
  // Create empty prefix string
  let prefix = ''

  if (!prefixes)
    prefixes = []

  // If a prefix / multiple prefixes are defined
  if (prefixes)
  // If the first item of the possible array contains properties that could indicate a LogPrefix object
  {
    if ((prefixes[0] as ILogPrefix).content)
    // For every log prefix item
    {
      prefix = (prefixes as ILogPrefix[]).map(prefixItem =>
      // Construct the prefix as a string, and add it to the 'prefix' string
				 `[${prefixItem.color ? colors[prefixItem.color] : colors.GREEN}${prefixItem.content.toUpperCase()}${colors.RESET}]`
      ).join(' ')
    }
    // If the prefixes item is a string
    else
    // Construct the prefix as a string, and add it to the 'prefix' string
      prefix = `[${color ? colors[color] : colors.GREEN}${(prefixes as string).toUpperCase()}${colors.RESET}]`
  }

  // Log the env, prefix and message
  // tslint:disable-next-line: no-console
  console.log(`[CRYB-API-${process.env.NODE_ENV.toUpperCase()}] ${prefix} ${msg}`)
}

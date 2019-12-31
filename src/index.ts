import server from './server'

const port = process.env.PORT || 4000
// tslint:disable-next-line: no-console
server.listen(port, () => console.log(require('fs').readFileSync('logo.txt', 'utf8').replace(':PORT', port)))

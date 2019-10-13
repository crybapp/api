import server from './server'

server.listen(4000, () => console.log(require('fs').readFileSync('logo.txt', 'utf8')))
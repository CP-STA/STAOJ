import { WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join as join_path } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sock_path = join_path(__dirname, 'staoj.exe.sock')

var client = new WebSocket("ws+unix://" + sock_path)

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

await new Promise(r => {client.on('open', function open() {
  client.send('opened connection');
  r(client)
});})

client.on('message', function message(data) {
  console.log('received: %s', data);
});

await sleep(10000);
client.send('abc');

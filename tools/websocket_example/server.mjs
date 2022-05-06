import * as fs from 'node:fs';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join as join_path } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sock_path = join_path(__dirname, 'staoj.exe.sock')
console.log("Socket created at: " + sock_path)
console.log("Listening")

try {
  fs.unlinkSync(sock_path)
} catch (err) {
  if (fs.existsSync(sock_path)) {
    throw err;
  }
}


var server = http.createServer()
var wss = new WebSocketServer({ server });
server.listen(sock_path)
wss.on('connection', function connection(ws) {
  ws.on('message', function message(data, isBinary) {
    console.log('received: %s, now broadcasting', data);
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
});

process.on('SIGINT', async function() {
  console.log("Cleaning up... Please wait");
  fs.unlinkSync(sock_path);
  process.exit();
});
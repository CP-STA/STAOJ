import { WebSocket } from 'ws';

let ws;

// Connect to socket
export function connectSocket(socketPath) {
  ws = new WebSocket('ws+unix://' + socketPath);
}

// Set the callback executed on message received
export function setReceiverCallback(receiver) {
  ws.on('message', function (raw) {
    const message = JSON.parse(raw);
    receiver(message);
  });
}

// For sending json
export function sendMessage(message) {
  ws.send(JSON.stringify(message));
}

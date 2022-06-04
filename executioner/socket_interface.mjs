import { WebSocket } from 'ws';
import * as fs from 'fs';

import { spawn } from 'child_process';

let ws;

export function init_socket(socket_path) {
    ws = new WebSocket("ws+unix://" + socket_path);
}


export function set_receiver_callback(receiver) {
    ws.on("message", function (raw) {
        const message = JSON.parse(raw);
        receiver(message);
    });
}

export function send_message(message) {
    ws.send(JSON.stringify(message));
}

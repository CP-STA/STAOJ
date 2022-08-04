#!/usr/bin/bash

repo_root="$(pwd)"/..

websocket_path="$repo_root"/tools/websocket_example

socket_log=example_socket.log

trap "exit" INT TERM
trap "kill 0" EXIT

# Run server
node "$websocket_path"/server.mjs > "$socket_log" &

printf "Running the socket, see %s for socket output\n" "$socket_log"

sleep 3 && printf "Sending Example Submission\n" && node "$websocket_path"/send_submission.mjs &

# Run executioner and exit when executioner completed sent
EXER_SOCKET="$websocket_path"/staoj.exe.sock REPO_PATH="$repo_root" node executioner.mjs

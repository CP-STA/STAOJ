# Websocket Implementation

This contains some useful scripts for you to test your websocket implementation. You can use it to setup a websocket server similar to the one defined in the interface specifications.

To run the websocket server,
```bash 
npm install 
node server.mjs
```

The server will broadcast any message it receives to all listening clients (including the sender). When it receives a message, it will print the content of the message to stdout for debugging purposes.

The `client.mjs` contains an example of a client implemented in nodejs. 

You can run 

```bash
node send_submission.mjs
```

to emulate the webserver sending a user submitted code to test your integration. 
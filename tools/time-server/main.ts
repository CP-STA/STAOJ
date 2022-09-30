import * as http from 'http';

http.createServer(function (req, res) {
    const headers = {
      'Access-Control-Allow-Origin': '*', //just a time server, nothing to worry about
    };
    res.writeHead(200, headers);
    res.write((new Date()).toISOString()); //write a response to the client
    res.end(); //end the response
  }).listen(5433); //the server object listens on port 8080 
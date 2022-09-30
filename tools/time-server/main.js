"use strict";
exports.__esModule = true;
var http = require("http");
http.createServer(function (req, res) {
    var headers = {
        'Access-Control-Allow-Origin': '*'
    };
    res.writeHead(200, headers);
    res.write((new Date()).toISOString()); //write a response to the client
    res.end(); //end the response
}).listen(5433); //the server object listens on port 8080 

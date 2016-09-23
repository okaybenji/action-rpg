/* jshint node: true */

'use strict';

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

const idGen = (function() {
  let id = 0;
  return function() {
    return 'user' + id++;
  };
}());

wss.on('connection', function connection(ws) {
  const id = idGen();
  wss.broadcast(id + ' connected');
  ws.on('message', function incoming(message) {
    const messageText = id + ': ' + message;
    console.log(messageText);
    wss.broadcast(messageText);
  });
});

'use strict';

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });

wss.broadcast = function broadcast(data) {
  const msg = JSON.stringify(data);

  wss.clients.forEach(function(client) {
    client.send(msg);
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

  console.log(id + ' connected');
  wss.broadcast({type: 'chat', text: id + ' connected'});

  ws.on('message', function incoming(message) {
    const msg = JSON.parse(message);
    switch (msg.type) {
      case 'chat':
        console.log(id + ': ' + msg.text);
        wss.broadcast({
          type: 'chat',
          text: id + ': ' + msg.text
        });
        break;
    }
  });
});

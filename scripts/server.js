'use strict';

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });
const utils = require('./utils');

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
  ws.id = id;
  ws.x = utils.randomIntBetween(0, 256);
  ws.y = utils.randomIntBetween(0, 240);

  console.log(id + ' connected. spawning at ' + ws.x + ',' + ws.y + '.');
  wss.broadcast({type: 'chat', text: id + ' connected'});

  // inform client of its id
  ws.send(JSON.stringify({
    type: 'id',
    id
  }));

  // spawn all existing players on client
  wss.clients.forEach(function(client) {
    if (client.id === id) {
      return; // don't spawn ourself yet
    }
    ws.send(JSON.stringify({
      type: 'spawn',
      id: client.id,
      x: client.x,
      y: client.y
    }));
  });

  // broadcast our own position (and spawn)
  wss.broadcast({
    type: 'spawn',
    id,
    x: ws.x,
    y: ws.y
  });

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
      case 'move':
        // TODO: implement movement code!
        break;
    }
  });
});

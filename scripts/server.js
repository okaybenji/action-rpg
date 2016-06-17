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

  // we always want to stringify our data
  // TODO: is there an elegant way to override ws.send to always stringify?
  ws.sendStr = function(msg) {
    ws.send(JSON.stringify(msg));
  };

  // inform client of its id
  ws.sendStr({ type: 'id', id });

  // spawn all existing players on client
  wss.clients.forEach(function(client) {
    if (client.id === id) {
      return; // don't spawn ourself yet
    }
    ws.sendStr({ type: 'spawn', id: client.id, x: client.x, y: client.y });
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
        // For now, we'll just respond with the latest input time so the client can purge any history
        // the server has already seen.
        // TODO: process the input history to determine the player's current position and send that
        // back along with the time
        const lastProcessedInputTime = msg.inputHistory[msg.inputHistory.length - 1].time;
        // TODO: is there any reason we need to send ws.id long-term?
        // right now we do because the client doesn't differentiate between itself and other players,
        // but eventually the move message for the player will only go back to that player.
        // of course we'll also have move msgs for other players... so we could either rename 'move'
        // to two messages like 'moveClient' and 'moveOther' or we could use the id or some other property
        // to tell client who it's moving/whether to clear the old input history...
        ws.sendStr({ type: 'move', time: lastProcessedInputTime, id: ws.id });
        console.log(id + ' last move at: ' + lastProcessedInputTime);
        break;
    }
  });
});

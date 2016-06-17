'use strict';

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });
const utils = require('./utils');
const movement = require('./movement.js');
const physics = require('./physics.js');

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
  ws.lastProcessedInput = { input: {}, time: 0 };

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
        /**
         * Process all input history received from client to calculate player's current position.
         * Send back the new position. Also send the time of the most recently processed input
         * so that the client can purge any input history which is no longer needed (and stop
         * sending that old history to the server).
         */
        // TODO: Client and server pos get slightly out of sync. This is probably because the client is
        // running its physics calculations every game tick and should maybe only do so every time
        // the input is sampled and stored to history. Experiment with updating position on client
        // the same was as on the server (processing input history), or at least only each time input
        // is stored to history. If a good value can't be found that keeps the client playing smoothly
        // and yet keeps packet size reasonable, maybe just use interpolation to move player where
        // server says he should be.
        // TODO: Update the server to ignore any data received which is older than lastProcessedInput.time.
        // TODO: rewrite this as a reduce function which just returns the new position, then set ws.x and
        // ws.y based on that!
        msg.inputHistory
          .forEach(inputSample => {
            const moveDirection = movement.player.inputToDirection(ws.lastProcessedInput.input);
            const velocity = movement.player.directionToVelocity(moveDirection);
            const newPosition = physics.getPosition({x: ws.x, y: ws.y}, velocity, inputSample.time - ws.lastProcessedInput.time);
            ws.lastProcessedInput = inputSample;
            ws.x = newPosition.x;
            ws.y = newPosition.y;
          });

        ws.sendStr({ type: 'move', time: ws.lastProcessedInput.time, id: ws.id, position: {x: ws.x, y: ws.y} });
        console.log(id + ' last move to: ' + ws.x + ',' + ws.y);
        break;
    }
  });
});

'use strict';

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });
const utils = require('./utils');
const movement = require('./movement.js');

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
  ws.lastProcessedInput = { input: {}, time: 0, position: { x: ws.x, y: ws.y } };

  console.log(id + ' connected. spawning at ' + ws.x + ',' + ws.y + '.');
  wss.broadcast({type: 'chat', text: id + ' connected'});

  // we always want to stringify our data
  // TODO: is there an elegant way to override ws.send to always stringify?
  ws.sendStr = function(msg) {
    console.log('sendstr:', msg);
    if (wss.clients.indexOf(ws) === -1) {
      return;
    }
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

  ws.on('close', function() {
    wss.clients.splice(wss.clients.indexOf(ws), 1)
    wss.broadcast({
      type: 'destroy',
      id: id
    });
  });

  // TODO: use strategy pattern here instead of storing logic in a switch
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
        const inputHistory = msg.inputHistory;
        const lastAppliedTime = ws.lastProcessedInput.time;
        const newPosition = movement.player.getPositionFromInputHistorySinceTime(inputHistory, lastAppliedTime);
        ws.x = newPosition.x;
        ws.y = newPosition.y;
        ws.lastProcessedInput = inputHistory[inputHistory.length - 1];

        let response = { type: 'move', time: ws.lastProcessedInput.time, id: ws.id };
        // if client's position at this time doesn't match our calculated position, send corrected position
        console.log('server position:', {x: ws.x, y: ws.y});
        console.log('client position:', {x: ws.lastProcessedInput.position.x, y: ws.lastProcessedInput.position.y});
        if (ws.x !== ws.lastProcessedInput.position.x || ws.y !== ws.lastProcessedInput.position.y) {
          response.position = {x: ws.x, y: ws.y};
        }
        // debugging: simulate lag by wrapping this in a timeout
        setTimeout(function() {
          ws.sendStr(response);
        }, 250);
        console.log(id + ' last move to: ' + ws.x + ',' + ws.y);
        console.log(id + ' last move at: ' + ws.lastProcessedInput.time);
        break;
    }
  });
});

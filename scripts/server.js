'use strict';

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });
const utils = require('./utils');
const movement = require('./movement.js');

const log = function(msg) {
  switch (msg.type) {
    case 'id':
      break;
    case 'chat':
      if (msg.id) {
        console.log(msg.id + ': ' + msg.text);
      }
      break;
    case 'spawn':
      console.log(msg.id + ' connected');
      break;
    case 'destroy':
      console.log(msg.id, 'disconnected');
      break;
    case 'move':
      break;
    default:
      break;
  }
};

wss.broadcast = function broadcast(msg) {
  log(msg);
  const str = JSON.stringify(msg);

  wss.clients.forEach(function(client) {
    client.send(str);
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

  wss.broadcast({type: 'chat', text: id + ' connected'});

  // we always want to stringify our data
  // TODO: is there an elegant way to override ws.send to always stringify?
  ws.sendStr = function(msg) {
    if (wss.clients.indexOf(ws) === -1) {
      return;
    }
    log(msg);
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
    wss.broadcast({type: 'chat', text: id + ' disconnected'});
    wss.broadcast({type: 'destroy', id: id});
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
        // TODO: Update the server to ignore any data received which is older than lastProcessedInput.time.
        const inputHistory = msg.inputHistory;
        const lastAppliedTime = ws.lastProcessedInput.time;
        const newPosition = movement.player.getPositionFromInputHistorySinceTime(inputHistory, lastAppliedTime);
        ws.x = newPosition.x;
        ws.y = newPosition.y;
        ws.lastProcessedInput = inputHistory[inputHistory.length - 1];

        let response = { type: 'move', time: ws.lastProcessedInput.time, id: ws.id };
        // if client's position at this time doesn't match our calculated position, send corrected position
        if (ws.x !== ws.lastProcessedInput.position.x || ws.y !== ws.lastProcessedInput.position.y) {
          console.log('correcting client', ws.id, 'position from:', {
            x: ws.lastProcessedInput.position.x,
            y: ws.lastProcessedInput.position.y
          }, 'to:', {x: ws.x, y: ws.y});
          response.position = {x: ws.x, y: ws.y};
        }
        // debugging: simulate lag by wrapping this in a timeout
//        setTimeout(function() {
          wss.broadcast(response);
//        }, 250);
        break;
    }
  });
});

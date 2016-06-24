// TODO: move these inside createSocket (here for now for console debugging)
let players = {};
let player; // ourself/client avatar

const createSocket = function() {
  const ws = new WebSocket('ws://localhost:8080');
  let id;

  ws.onmessage = function(data, flags) {
    const msg = JSON.parse(data.data);
//    console.log('received message:', msg);

    const messageHandlers = {
      id() {
        id = msg.id;
      },
      chat() {
        chat.log(msg.text);
      },
      spawn() {
        if (msg.id === id) {
          player = players[msg.id] = createPlayer(game, {x: msg.x, y: msg.y, isClient: true});
        } else {
          players[msg.id] = createPlayer(game, {x: msg.x, y: msg.y});
          // TODO: probably create this in the player module by passing config
          players[msg.id].inputHistory = [];
        }
      },
      move() {
        if (msg.id === id) { // it's us!
          // if the client's position at last received time from server does not match server's
          // reported position, reconcile the player position
          msg.data.forEach(inputSample => {
            if (player && !player.positionAtTimeMatchesServer(inputSample.time, inputSample.position)) {
              player.queuePositionSyncWithServer(inputSample.time, inputSample.position);
            }
          });
        } else { // it's someone else
          // determine offset to convert from other player's local time to ours
          // NOTE: current implementation is naive --
          // doesn't account for the time it took other player's message to get to the server
          // then to us
          if (!players[msg.id].timeOffset) { // TODO: get time from client and set timeOffset on spawn rather than have this if
            let playerTime = msg.data.last().time; // TODO: probably create this in the player module by passing config
            let buffer = 100; // how far in the past other player's actions should appear
            players[msg.id].timeOffset = (game.time.now + buffer) - playerTime;
          }
          players[msg.id].inputHistory = players[msg.id].inputHistory.concat(msg.data);
        }
      },
      destroy() {
        // TODO: test this -- it may not be working
        if (players[msg.id]) {
          players[msg.id].destroy();
        }
      },
    };

    messageHandlers[msg.type]();
  };

  return {
    send(message) {
      const msg = JSON.stringify(message);
      ws.send(msg);
    }
  };
};

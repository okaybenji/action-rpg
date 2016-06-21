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
        }
      },
      move() {
        if (msg.id === id) { // it's us!
          // if the client's position at last received time from server does not match server's
          // reported position, reconcile the player position
          if (player && !player.positionAtTimeMatchesServer(msg.time, msg.position)) {
            player.queuePositionSyncWithServer(msg.time, msg.position);
          }
        } else { // it's someone else
          // update position
          // TODO: interpolate over time
          // TODO: implement lag compensation (broadcast input histories and play them back in the past)
          // start appropriate walk animation
          const direction = movement.player.inputToDirection(msg.input);
          players[msg.id].actions.walk(direction);
          // update position
          players[msg.id].x = msg.position.x;
          players[msg.id].y = msg.position.y;
          // attack if appropriate
          if (msg.input.attack) {
            players[msg.id].actions.attack();
          }
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

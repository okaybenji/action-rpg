const createSocket = function() {
  const ws = new WebSocket('ws://action-rpg-okaybenji.c9users.io:8080');
  let id;
  let players = {};
  let player; // ourself/client avatar

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
            players[msg.id].queuePositionSyncWithServer(msg.time, msg.position);
          }
        } else { // it's someone else
          // update position
          // TODO: interpolate over time
          // TODO: implement lag compensation (broadcast input histories and play them back in the past)
          players[msg.id].x = msg.position.x;
          players[msg.id].y = msg.position.y;
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

const createSocket = function() {
  const ws = new WebSocket('ws://localhost:8080');
  let id;
  let players = {};
  let player; // ourself/client avatar

  ws.onmessage = function(data, flags) {
    const msg = JSON.parse(data.data);
//    console.log('received message:', msg);

    switch (msg.type) {
      case 'id':
        id = msg.id;
        break;
      case 'chat':
        chat.log(msg.text);
        break;
      case 'spawn':
        if (msg.id === id) {
          player = players[msg.id] = createPlayer(game, {x: msg.x, y: msg.y, isClient: true});
        } else {
          players[msg.id] = createPlayer(game, {x: msg.x, y: msg.y});
        }
        break;
      case 'destroy':
        if (players[msg.id]) {
          players[msg.id].destroy();
        }
        console.log(msg.id, 'disconnected.');
        break;
      case 'move':
        if (msg.id === id) { // us
          // if the client's position at last received time from server does not match server's
          // reported position, reconcile the player position
          if (player && !player.positionAtTimeMatchesServer(msg.time, msg.position)) {
            players[msg.id].syncPositionWithServer(msg.time, msg.position);
          }
          players[msg.id].clearInputHistoryBeforeTime(msg.time);
        } else { // someone else
          // update position
          // TODO: interpolate over time
          // TODO: implement lag compensation (broadcast input histories and play them back in the past)
          players[msg.id].x = msg.position.x;
          players[msg.id].y = msg.position.y;
        }
        break;
    }
  };

  return {
    send(message) {
      const msg = JSON.stringify(message);
      ws.send(msg);
    }
  };
};

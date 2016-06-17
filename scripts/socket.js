const createSocket = function() {
  const ws = new WebSocket('ws://localhost:8080');
  let id;
  let players = {};

  ws.onmessage = function(data, flags) {
    const msg = JSON.parse(data.data);
    console.log('received message:', msg);

    switch (msg.type) {
      case 'id':
        id = msg.id;
        break;
      case 'chat':
        chat.log(msg.text);
        break;
      case 'spawn':
        // don't spawn a player more than once! // TODO: uh why would this happen anyway?
        if (players[msg.id]) {
          console.warn('tried to recreate player with id:', msg.id);
          break;
        }

        players[msg.id] = createPlayer(game, {x: msg.x, y: msg.y});
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

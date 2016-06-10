const ws = new WebSocket('ws://localhost:8080');

// custom wrapper
const socket = {
  send(message) {
    const msg = JSON.stringify(message);
    ws.send(msg);
  }
};

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

      // TODO: for some reason, players created here aren't visible
      // unless the tab is inactive when this method is called!
      players[msg.id] = createPlayer(game, {x: msg.x, y: msg.y});
      chat.log(msg.id + ' spawned at ' + msg.x + ',' + msg.y);
      console.log('players:', players);
      break;
  }
};

const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = function(data, flags) {
  const msg = JSON.parse(data.data);

  switch (msg.type) {
    case 'chat':
      chat.log(msg.text);
      break;
  }
};

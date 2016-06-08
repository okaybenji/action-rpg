const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = function(data, flags) {
  const messageText = data.data;
  chat.log(messageText);
};

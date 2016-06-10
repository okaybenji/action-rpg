const ws = new WebSocket('ws://action-rpg-okaybenji.c9users.io:8080');

ws.onmessage = function(data, flags) {
  const messageText = data.data;
  chat.log(messageText);
};

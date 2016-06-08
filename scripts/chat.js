const input = document.querySelector('#chat input');

document.onkeyup = function(event) {
  if (event.keyCode === 84) { // 't'
    input.classList.remove('hidden');
    input.disabled = false;
    input.focus();
  }
};

input.onkeydown = function(event) {
  if (event.keyCode === 13) { // enter
    chat.send(input.value);
    input.disabled = true;
    input.classList.add('hidden');
    input.value = '';
  }
};

const chat = {
  send(msg) {
    ws.send(msg);
  },
  log(msg) {
    // displays a message, then fades out and removes it
    const output = document.querySelector('#chat #messages');
    const duration = 8000;
    const fadeTime = 2000;
    const msgElement = document.createElement('li');
    msgElement.textContent = msg;
    output.appendChild(msgElement);

    setTimeout(function() {
      msgElement.classList.add('fade');
    }, duration - fadeTime);

    setTimeout(function() {
      output.removeChild(msgElement);
    }, duration);
  }
};

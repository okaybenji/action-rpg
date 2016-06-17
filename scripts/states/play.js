let socket;

var Play = function(game) {
  var play = {
    create: function create() {
      game.input.gamepad.start();
      socket = createSocket();
    },

    update: function update() {
      var self = this;
    }
  };
  
  return play;
};

//module.exports = Play;

var Play = function(game) {
  var play = {
    create: function create() {
      game.physics.startSystem(Phaser.Physics.ARCADE); // TODO: write custom physics which can be rewound and played back for server sync
      game.input.gamepad.start();
    },

    update: function update() {
      var self = this;
    }
  };
  
  return play;
};

//module.exports = Play;

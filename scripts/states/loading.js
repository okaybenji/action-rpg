var Loading = function(game) {
  var loading = {
    init: function() {
      var loading = game.add.sprite(26, 29, 'loading');
      loading.animations.add('loading');
      loading.animations.play('loading');

      document.getElementById('loading').style.display = 'none';
    },

    preload: function() {
      /*game.load.image('blue', 'images/colors/blue.png');
      game.load.image('clear', 'images/colors/clear.png');
      game.load.image('green', 'images/colors/green.png');
      game.load.image('orange', 'images/colors/orange.png');
      game.load.image('pink', 'images/colors/pink.png');
      game.load.image('purple', 'images/colors/purple.png');
      game.load.image('white', 'images/colors/white.png');
      game.load.image('yellow', 'images/colors/yellow.png');*/
      game.load.spritesheet('player-walk-n', 'images/player/walk-n.png', 16, 16);
      game.load.spritesheet('player-walk-s', 'images/player/walk-s.png', 16, 16);
      game.load.spritesheet('player-walk-e', 'images/player/walk-e.png', 16, 16);
      game.load.spritesheet('player-walk-w', 'images/player/walk-w.png', 16, 16);
      game.load.image('player-attack-n', 'images/player/attack-n.png');
      game.load.image('player-attack-s', 'images/player/attack-s.png');
      game.load.image('player-attack-e', 'images/player/attack-e.png');
      game.load.image('player-attack-w', 'images/player/attack-w.png');
    },

    create: function() {
      game.input.gamepad.start();
      game.state.add('play', Play(game));
      game.state.start('play');
    }
  };
  
  return loading;
};

//module.exports = Loading;

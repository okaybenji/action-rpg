var Loading = function(game) {
  var loading = {
    init: function() {
      var loading = game.add.sprite(26, 29, 'loading');
      loading.animations.add('loading');
      loading.animations.play('loading');

      document.getElementById('loading').style.display = 'none';
    },

    preload: function() {
      game.load.image('blue', 'images/colors/blue.png');
      game.load.image('clear', 'images/colors/clear.png');
      game.load.image('green', 'images/colors/green.png');
      game.load.image('orange', 'images/colors/orange.png');
      game.load.image('pink', 'images/colors/pink.png');
      game.load.image('purple', 'images/colors/purple.png');
      game.load.image('white', 'images/colors/white.png');
      game.load.image('yellow', 'images/colors/yellow.png');
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

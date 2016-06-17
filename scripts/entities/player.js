var createPlayer = function createPlayer(game, options) {
  var defaults = {
    x: utils.randomIntBetween(0, game.width),
    y: utils.randomIntBetween(0, game.height),
    orientation: 'down', // may use this for shield logic
    keys: {
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      attack: 'SHIFT'
    },
    gamepad: game.input.gamepad.pad1,
  };

  var settings = Object.assign({}, defaults, options);

  var keys = {
    up: game.input.keyboard.addKey(Phaser.Keyboard[settings.keys.up]),
    down: game.input.keyboard.addKey(Phaser.Keyboard[settings.keys.down]),
    left: game.input.keyboard.addKey(Phaser.Keyboard[settings.keys.left]),
    right: game.input.keyboard.addKey(Phaser.Keyboard[settings.keys.right]),
    attack: game.input.keyboard.addKey(Phaser.Keyboard[settings.keys.attack]),
  };

  var gamepad = settings.gamepad;
  var lastInputSampleTime = 0;
  var lastInputUploadTime = 0;
  // lastInputUploadLatestSampleTime is the most recent sample time in inputHistory (the time from the last element in the array)
  // TODO: come up with a better name
  var lastInputUploadLatestSampleTime = 0; 
  var lastInputSample;
  var inputHistory = [];
  var velocity = {x: 0, y: 0};

  function downconvertDirection(direction) {
    var newDirection;

      switch (direction) {
        case 'n':
        case 'ne':
        case 'nw':
          newDirection = 'n';
      }

      switch (direction) {
        case 's':
        case 'se':
        case 'sw':
          newDirection = 's';
      }

      switch (direction) {
        case 'w':
        case 'nw':
        case 'sw':
          newDirection = 'w';
      }

      switch (direction) {
        case 'e':
        case 'ne':
        case 'se':
          newDirection = 'e';
      }

    return newDirection;
  }

  var actions = {
    attack: function attack() {
      player.isAttacking = true;
      var duration = 200;
      var interval = 600;

      var canAttack = (Date.now() > player.lastAttacked + interval);
      if (!canAttack) {
        return;
      }

      player.lastAttacked = Date.now();

//      game.sfx.play('attack');
      player.loadTexture('player-attack-' + player.orientation);

      setTimeout(function endAttack() {
        if (player.alive) {
          player.loadTexture('player-walk-' + player.orientation);
        }
        player.isAttacking = false;
      }, duration);
    },

    walk: function walk(direction) {
      if (direction) {
        player.orientation = downconvertDirection(direction);
        if (!player.isAttacking) {
          var texture = 'player-walk-' + player.orientation;
          if (player.key !== texture) {
            player.loadTexture('player-walk-' + player.orientation);
          }
          player.animations.play('walk', 6, true);
        }
      } else {
        player.animations.stop();
      }

      velocity = movement.player.directionToVelocity(direction);
    },

    takeDamage: function takeDamage(amount) {
      player.hp -= amount;

      if (player.hp <= 0) {
        player.hp = 0;
        actions.die();
      }
    },

    die: function() {
      // game.sfx.play('die');
      // actions.endAttack();
    },
  };

  var player = game.add.sprite(0, 0, 'player-walk-s');
  player.animations.add('walk');
  player.name = settings.name;
  player.orientation = settings.orientation;
  player.x = settings.x;
  player.y = settings.y;

  // track health
  player.hp = player.maxHp = 6;
  player.actions = actions;

  player.lastAttacked = 0;

  player.clearInputHistoryBeforeTime = function(time) {
    const inputHistoryAfterTime = function(time) {
      return inputHistory.filter(inputSample => inputSample.time > time);
    };
    inputHistory = inputHistoryAfterTime(time);
  };

  player.update = function() {
    var input = {
      left:   (keys.left.isDown && !keys.right.isDown) ||
              (gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_LEFT) && !gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_RIGHT)) ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) < -0.1 ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_RIGHT_X) < -0.1,
      right:  (keys.right.isDown && !keys.left.isDown) ||
              (gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_RIGHT) && !gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_LEFT)) ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) > 0.1 ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_RIGHT_X) > 0.1,
      up:     keys.up.isDown ||
              gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_UP),
      down:   keys.down.isDown ||
              gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_DOWN) ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y) > 0.1 ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_RIGHT_Y) > 0.1,
      attack: keys.attack.isDown ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_X) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_Y) ||
              gamepad.isDown(Phaser.Gamepad.XBOX360_A) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_B) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_LEFT_BUMPER) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_LEFT_TRIGGER) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_RIGHT_BUMPER) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_RIGHT_TRIGGER),
    };

    actions.walk(movement.player.inputToDirection(input));

    var position = physics.getPosition({x: player.x, y: player.y}, velocity, game.time.elapsed);
    player.x = position.x;
    player.y = position.y;

    if (input.attack) {
      actions.attack();
    }

    // store player input at fixed intervals
    var inputSamplesPerSecond = 25;
    var inputSampleInterval = 1000 / inputSamplesPerSecond;
    if (game.time.now >= lastInputSampleTime + inputSampleInterval) {
      // store current player input if it has changed since the last sample
      if (!utils.objectsAreEqual(lastInputSample, input)) {
        inputHistory.push({input, time: game.time.now});
        lastInputSample = input;
      }
      lastInputSampleTime = game.time.now;
    }
    
    // send stored input to server at fixed intervals
    // TODO: on server response, clear out any history server has processed
    var inputUploadPerSecond = 6;
    var inputUploadInterval = 1000 / inputUploadPerSecond;
    if (game.time.now >= lastInputUploadTime + inputUploadInterval) {
      // upload player input history if it has been updated since the last upload and is not empty
      if (inputHistory.length && inputHistory[inputHistory.length - 1].time > lastInputUploadLatestSampleTime) {
        console.log('sending inputHistory with length:', inputHistory.length);
        socket.send({type: 'move', inputHistory});
        lastInputUploadLatestSampleTime = inputHistory[inputHistory.length - 1].time;
      }
      lastInputUploadTime = game.time.now;
    }
  };

  return player;
};

//module.exports = createPlayer;

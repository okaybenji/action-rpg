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
        // console.log('pos:' + player.x + ',' + player.y);
      } else {
        player.animations.stop();
      }
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

  /**
   * Compare what the server says the player's position should be at the most recent
   * time we've gotten back from the server to what the position was on the client
   * at that time. If the positions differ, recalculate the player's current position
   * using the server-calculated position as the starting point and reconciling
   * (reapplying any inputs in history since then).
   * See: http://www.gabrielgambetta.com/fpm_live.html
   */
  // TODO: interpolate and changes smoothly over time
  // TODO: huh, the reconciliation (playing back recorded input since 'time') isn't working... for
  // some reason, clearInputHistoryBeforeTime seems to be wiping out the history since time as well
  player.syncPositionWithServer = function(time, serverPositionAtTime) {
    // TODO: discard any server data with time we don't have because it's old/out of order?
    const inputSampleAtTime = inputHistory.find(inputSample => inputSample.time === time);
    const localPositionAtTime = inputSampleAtTime.position;

    if (utils.objectsAreEqual(localPositionAtTime, serverPositionAtTime)) {
      console.log('match! returning');
      return;
    }

    // move player back to prior position by server authority
    player.x = serverPositionAtTime.x;
    player.y = serverPositionAtTime.y;

    console.log('inputHistory before clear:', inputHistory);
    // remove history from before player was at this position
    player.clearInputHistoryBeforeTime(time);

    // copy by val
    let lastProcessedInput = Object.assign({}, inputSampleAtTime);

    // reapply client inputs since server time
    // TODO: similar code is used in server a client; extract to movement module and share code
    console.log('inputHistory after clear:', inputHistory);
    inputHistory.forEach(inputSample => {
      const moveDirection = movement.player.inputToDirection(lastProcessedInput.input);
      const velocity = movement.player.directionToVelocity(moveDirection);
      const newPosition = physics.getPosition({x: player.x, y: player.y}, velocity, inputSample.time - lastProcessedInput.time);
      lastProcessedInput = inputSample;
      player.x = newPosition.x;
      player.y = newPosition.y;
      console.log('moved player to:', player.x, ',', player.y);
    });
  };

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

    var direction = movement.player.inputToDirection(input);
    actions.walk(direction);

    // client-side prediction:
    velocity = movement.player.directionToVelocity(direction);
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
        // TODO: experiment with only predicting client movement with each input sample
//        // client-side prediction:
//        actions.walk(movement.player.inputToDirection(input));
//        var position = physics.getPosition({x: player.x, y: player.y}, velocity, game.time.elapsed);
//        player.x = position.x;
//        player.y = position.y;

        // TODO: consider removing position from input sample data before sending to server
        inputHistory.push({input, time: game.time.now, position: {x: player.x, y: player.y}});
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
        socket.send({type: 'move', inputHistory});
        lastInputUploadLatestSampleTime = inputHistory[inputHistory.length - 1].time;
      }
      lastInputUploadTime = game.time.now;
    }
  };

  return player;
};

//module.exports = createPlayer;

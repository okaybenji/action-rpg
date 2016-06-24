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
    isClient: false
  };

  var settings = Object.assign({}, defaults, options);

  if (settings.isClient) {
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
    // latestUploadedInputSampleTime is the most recent sample time in inputHistory (the time from the last element in the array)
    // TODO: come up with a better name
    var latestUploadedInputSampleTime = 0;
    var lastInputSample;
    var serverReconciliationHistory = [];
  }

  var velocity = {x: 0, y: 0};

  function downconvertDirection(direction) {
    let newDirection;

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
    attack() {
      player.isAttacking = true;
      const duration = 200;
      const interval = 600;

      const canAttack = (Date.now() > player.lastAttacked + interval);
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

    walk(direction) {
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
    },

    takeDamage(amount) {
      player.hp -= amount;

      if (player.hp <= 0) {
        player.hp = 0;
        actions.die();
      }
    },

    die() {
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
  player.inputHistory = [{ input: {}, time: 0, position: { x: settings.x, y: settings.y } }];

  // track health
  player.hp = player.maxHp = 6;
  player.actions = actions;

  player.lastAttacked = 0;

  player.positionAtTimeMatchesServer = function(serverTime, serverPositionAtTime) {
    const inputAtTime = player.inputHistory.find(inputSample => inputSample.time === serverTime);

    // if inputHistory doesn't have this time, assume we already consumed the server data,
    // and this just arrived out of order
    if (!inputAtTime) {
      return true;
    }

    const clientPositionAtTime = inputAtTime.position;
    return utils.objectsAreEqual(clientPositionAtTime, serverPositionAtTime);
  };

  /**
   * Called when server disagrees with client's position at a given time.
   * Adds corrected position and time data to a queue to be merged with client input history
   * for reconciliation.
   * Recalculates the player's current position using the server-calculated position as
   * the starting point and reconciling (reapplying any inputs in history since then).
   * See: http://www.gabrielgambetta.com/fpm_live.html
   */
  // TODO: interpolate and changes smoothly over time
  player.queuePositionSyncWithServer = function(serverTime, serverPositionAtTime) {
    // TODO: discard any server data with time we don't have because it's old/out of order?
    serverReconciliationHistory.push({time: serverTime, position: serverPositionAtTime});
  };

  player.syncPositionWithServer = function() {
    if (!serverReconciliationHistory.length) {
      return;
    }
    // merge input history with positions from server
    player.inputHistory = player.inputHistory.map(inputSample => {
      // look to see if this sample has a corresponding time in the data received from the server
      const courseCorrection = serverReconciliationHistory.find(reconData => reconData.time === inputSample.time);
      if (courseCorrection) {
        return Object.assign({}, inputSample, courseCorrection);
      } else {
        return inputSample;
      }
    });

    // start with prior position by server authority,
    // then reapply client inputs since server time to determine player's current reconciled position
//    const inputHistorySinceServerTime = movement.player.getInputHistorySinceTime(inputHistory, serverTime);

    const newPosition = movement.player.getInputHistoryWithPosition(player.inputHistory).last().position;
    // TODO: interpolate to new position over time!
    // TODO: isn't there a terser es6 way to do this sort of thing?
    player.x = newPosition.x;
    player.y = newPosition.y;

    // purge consumed history
    const lastReconciledTime = serverReconciliationHistory.last().time;
//    player.clearInputHistoryBeforeTime(lastReconciledTime);
    serverReconciliationHistory = [];
  };

  player.clearInputHistoryBeforeTime = function(time) {
    const inputHistorySinceTime = function(time) {
      return player.inputHistory.filter(inputSample => inputSample.time > time);
    };
    player.inputHistory = inputHistorySinceTime(time);
  };

  const otherPlayer = {
    update() {
      // plays back other players' movements a fixed time in the past

      // TODO: interpolate positions over time -- if we are between input times,
      // get the weighted position between the two based on the current time
      // TODO: refactor this 'otherPlayer' nonsense
      const time = game.time.now - player.timeOffset;
      var inputSampleAtTime = player.inputHistory.find(inputSample => inputSample.time <= time);
      if (!inputSampleAtTime) {
        return;
      }

      // start appropriate walk animation
      const direction = movement.player.inputToDirection(inputSampleAtTime.input);
      player.actions.walk(direction);
      // update position
      player.x = inputSampleAtTime.position.x;
      player.y = inputSampleAtTime.position.y;
      // attack if appropriate
      if (inputSampleAtTime.input.attack) {
        player.actions.attack();
      }

      // purge consumed history
      player.clearInputHistoryBeforeTime(time);
    }
  };

  player.update = function() {
    if (!settings.isClient) {
      otherPlayer.update();
      return;
    }

    const input = {
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
    const inputSamplesPerSecond = 30;
    const inputSampleInterval = 1000 / inputSamplesPerSecond;
    const inputSamplesPerUpload = 5; // how many samples to collect before sending to server
    const isTimeToUpdate = game.time.now >= lastInputSampleTime + inputSampleInterval;
    const inputsHaveChanged = !utils.objectsAreEqual(input, player.inputHistory.last().input);
    if (isTimeToUpdate || inputsHaveChanged) {
      // TODO: consider removing position from input sample data before sending to server
      player.inputHistory.push({input, time: game.time.now, position: {x: player.x, y: player.y}});
      lastInputSample = input;
      lastInputSampleTime = game.time.now;

      // apply any course corrections from the server
      player.syncPositionWithServer();
      const shouldUploadSamples = movement.player.getInputHistorySinceTime(player.inputHistory, latestUploadedInputSampleTime).length >= inputSamplesPerUpload;
      if (shouldUploadSamples) {
        // send stored input to server
        socket.send({type: 'move', inputHistory: player.inputHistory});
        latestUploadedInputSampleTime = player.inputHistory.last().time;
      }
    }
  };

  return player;
};

//module.exports = createPlayer;

let gPlayer; // debugging: expose player

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
    // lastInputUploadLatestSampleTime is the most recent sample time in inputHistory (the time from the last element in the array)
    // TODO: come up with a better name
    var lastInputUploadLatestSampleTime = 0;
    var lastInputSample;
    var inputHistory = [{ input: {}, time: 0, position: { x: settings.x, y: settings.y } }];
  }

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

  player.positionAtTimeMatchesServer = function(serverTime, serverPositionAtTime) {
    const clientPositionAtTime = inputHistory
      .find(inputSample => inputSample.time === serverTime)
      .position
    ;
    return clientPositionAtTime === serverPositionAtTime;
  };

  /**
   * Called when server disagrees with client's position at a given time.
   * Recalculates the player's current position using the server-calculated position as
   * the starting point and reconciling (reapplying any inputs in history since then).
   * See: http://www.gabrielgambetta.com/fpm_live.html
   */
  // TODO: interpolate and changes smoothly over time
  // TODO: huh, the reconciliation (playing back recorded input since 'time') isn't working... for
  // some reason, local inputHistory only ever has history up to (not beyond) server time :/ ??
  // UPDATE: i think reconciliation is still not working, but another change i made means that
  // the client-side prediction is much more accurate (rounding physics to nearest pixel, i think),
  // and because of this, the hiccups caused by failed recon are happening much more rarely.
  // (although thinking about it more now, i don't know if that makes any sense... even with perfect
  // prediction, recon should cause rubber banding. see above example. &shrug;)
  // still need to figure out why it's not working as intended and correct it.
  player.syncPositionWithServer = function(serverTime, serverPositionAtTime) {
    // TODO: discard any server data with time we don't have because it's old/out of order?
    // move player back to prior position by server authority
    player.x = serverPositionAtTime.x;
    player.y = serverPositionAtTime.y;

    // update the captured position stored in inputHistory with the corrected value from the server
    inputHistory = inputHistory.map(inputSample => {
      if (inputSample.time === serverTime) {
        inputSample.position = serverPositionAtTime;
      }
      return inputSample;
    });

    // reapply client inputs since server time
    const newPosition = movement.player.getPositionFromInputHistorySinceTime(inputHistory, serverTime);
    console.log('reconciling position with server');
    // TODO: isn't there a terser es6 way to do this sort of thing?
    // TODO: interpolate to new position over time!
    player.x = newPosition.x;
    player.y = newPosition.y;
  };

  player.clearInputHistoryBeforeTime = function(time) {
    const inputHistorySinceTime = function(time) {
      return inputHistory.filter(inputSample => inputSample.time > time);
    };
    inputHistory = inputHistorySinceTime(time);
  };

  player.update = function() {
    if (!settings.isClient) {
      return;
    }

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
      // TODO: only store current player input if it has changed since the last sample, e.g.:
      if (!utils.objectsAreEqual(lastInputSample, input)) {
      // NOTE that this will mean making confusing updates to position reconciliation
        // TODO: consider removing position from input sample data before sending to server
        // and checking on client whether server position disagrees with client historical position
        // (instead of performing this check on the server)
        inputHistory.push({input, time: game.time.now, position: {x: player.x, y: player.y}});
        lastInputSample = input;
      }
      lastInputSampleTime = game.time.now;
    }
    
    // send stored input to server at fixed intervals
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

  gPlayer = player; // debugging: expose player
  return player;
};

//module.exports = createPlayer;

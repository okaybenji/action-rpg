var createPlayer = function createPlayer(game, options) {
  var defaults = {
    orientation: 'down', // may use this for shield logic
    keys: {
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      attack: 'SHIFT'
    },
//    color: 'pink',
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

    run: function run(direction) {
      var maxSpeed = 32;
      var acceleration = 8;
      var animDirection;
      player.orientation = downconvertDirection(direction);

      switch (direction) {
        case 'n':
        case 'ne':
        case 'nw':
          player.body.velocity.y = Math.max(player.body.velocity.y - acceleration, -maxSpeed);
      }

      switch (direction) {
        case 's':
        case 'se':
        case 'sw':
          player.body.velocity.y = Math.min(player.body.velocity.y + acceleration, maxSpeed);
          animDirection = 's';
      }

      switch (direction) {
        case 'w':
        case 'nw':
        case 'sw':
          player.body.velocity.x = Math.max(player.body.velocity.x - acceleration, -maxSpeed);
          animDirection = 'w';
      }

      switch (direction) {
        case 'e':
        case 'ne':
        case 'se':
          player.body.velocity.x = Math.min(player.body.velocity.x + acceleration, maxSpeed);
          animDirection = 'e';
      }

      if (!player.isAttacking) {
        var texture = 'player-walk-' + player.orientation;
        if (player.key !== texture) {
          player.loadTexture('player-walk-' + player.orientation);
        }
        player.animations.play('walk', 6, true);
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
//      game.sfx.play('die');
//        actions.endAttack();
    },
  };

//  var player = game.add.sprite(0, 0, settings.color);
  var player = game.add.sprite(0, 0, 'player-walk-s');
  player.animations.add('walk');
  player.name = settings.name;
  player.orientation = settings.orientation;

  // track health
  player.hp = player.maxHp = 6;
  player.actions = actions;

  game.physics.arcade.enable(player);
  player.body.collideWorldBounds = true;
  player.body.gravity.y = 0;

  player.lastAttacked = 0;

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
              gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_UP) ||
              gamepad.isDown(Phaser.Gamepad.XBOX360_A),
      down:   keys.down.isDown ||
              gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_DOWN) ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y) > 0.1 ||
              gamepad.axis(Phaser.Gamepad.XBOX360_STICK_RIGHT_Y) > 0.1,
      attack: keys.attack.isDown ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_X) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_Y) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_B) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_LEFT_BUMPER) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_LEFT_TRIGGER) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_RIGHT_BUMPER) ||
              gamepad.justPressed(Phaser.Gamepad.XBOX360_RIGHT_TRIGGER),
    };

    switch (true) {
      case input.up && !input.down && !input.left && !input.right:
        actions.run('n');
        break;
      case !input.up && input.down && !input.left && !input.right:
        actions.run('s');
        break;
      case !input.up && !input.down && !input.left && input.right:
        actions.run('e');
        break;
      case !input.up && !input.down && input.left && !input.right:
        actions.run('w');
        break;
      case input.up && !input.down && !input.left && input.right:
        actions.run('ne');
        break;
      case input.up && !input.down && input.left && !input.right:
        actions.run('nw');
        break;
      case !input.up && input.down && !input.left && input.right:
        actions.run('se');
        break;
      case !input.up && input.down && input.left && !input.right:
        actions.run('sw');
        break;
    }

    // apply friction
    function applyFriction(axis) {      
      if (Math.abs(player.body.velocity[axis]) < 2) {
        player.body.velocity[axis] *= 0.5; // quickly bring slow-moving players to a stop
      } else if (player.body.velocity[axis] > 0) {
        player.body.velocity[axis] -= 2;
      } else if (player.body.velocity[axis] < 0) {
        player.body.velocity[axis] += 2;
      }
    }
    applyFriction('x');
    applyFriction('y');

    if (Math.abs(player.body.velocity.y) === 0 && Math.abs(player.body.velocity.x) === 0) {
      player.animations.stop();
    }

    if (input.attack) {
      actions.attack();
    }
  };

  return player;
};

//module.exports = createPlayer;

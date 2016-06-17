const movement = {
  player: {
    inputToDirection(input) {
      switch (true) {
        case input.up && !input.down && !input.left && !input.right:
          return 'n';
        case !input.up && input.down && !input.left && !input.right:
          return 's';
        case !input.up && !input.down && !input.left && input.right:
          return 'e';
        case !input.up && !input.down && input.left && !input.right:
          return 'w';
        case input.up && !input.down && !input.left && input.right:
          return 'ne';
        case input.up && !input.down && input.left && !input.right:
          return 'nw';
        case !input.up && input.down && !input.left && input.right:
          return 'se';
        case !input.up && input.down && input.left && !input.right:
          return 'sw';
        default:
          return undefined;
      }
    }
  }
};

// module.exports = movement;

const physics = {
  getValue(priorValue, rateOfChange, deltaTime) {
    return priorValue + rateOfChange * deltaTime;
  },
  getPosition(priorPosition, velocity, deltaTime) {
    const x = this.getValue(priorPosition.x, velocity.x, deltaTime);
    const y = this.getValue(priorPosition.y, velocity.y, deltaTime);
    return {x, y};
  }
};

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
    },
    directionToVelocity(direction) {
      const moveSpeed = 0.05; // in pixels per ms

      switch (direction) {
        case 'n':
          return {x: 0, y: -moveSpeed};
        case 'ne':
          return {x: moveSpeed, y: -moveSpeed};
        case 'nw':
          return {x: -moveSpeed, y: -moveSpeed};
        case 's':
          return {x: 0, y: moveSpeed};
        case 'se':
          return {x: moveSpeed, y: moveSpeed};
        case 'sw':
          return {x: -moveSpeed, y: moveSpeed};
        case 'w':
          return {x: -moveSpeed, y: 0};
        case 'nw':
          return {x: -moveSpeed, y: -moveSpeed};
        case 'sw':
          return {x: -moveSpeed, y: moveSpeed};
        case 'e':
          return {x: moveSpeed, y: 0};
        case 'ne':
          return {x: moveSpeed, y: -moveSpeed};
        case 'se':
          return {x: moveSpeed, y: moveSpeed};
        default:
          return {x: 0, y: 0};
      }
    },
    getInputHistorySinceTime(inputHistory, time) {
      return inputHistory.filter(inputSample => inputSample.time >= time);
    },
    getPositionFromInputHistory(inputHistory) {
      return inputHistory
        .reduce((prev, curr) => {
          const lastMoveDirection = movement.player.inputToDirection(prev.input);
          const velocity = movement.player.directionToVelocity(lastMoveDirection);
          const newPosition = physics.getPosition({x: prev.position.x, y: prev.position.y}, velocity, curr.time - prev.time);
          return Object.assign({}, curr, { position: newPosition });
        })
        .position;
    },
  }
};

if (typeof module !== 'undefined') {
  module.exports = movement;
}

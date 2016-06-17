const physics = {
  getValue(priorValue, rateOfChange, deltaTime) {
    return priorValue + rateOfChange * deltaTime;
  },
  getPosition(position, velocity, deltaTime) {
    const x = this.getValue(position.x, velocity.x, deltaTime);
    const y = this.getValue(position.y, velocity.y, deltaTime);
    return {x, y};
  }
};

// module.exports = physics;

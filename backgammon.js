import _ from './libs/atomic_/core.js';

// Backgammon logic
const WHITE = 0;
const BLACK = 1;

// Initial board setup
export function init() {
	return {
		points: [
			[0, 5], // Point 0: 0 white, 5 black
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[5, 0], // Point 5: 5 white, 0 black
			[0, 3], // Point 6: 0 white, 3 black
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 5], // Point 10: 0 white, 5 black
			[5, 0], // Point 11: 5 white, 0 black
			[5, 0], // Point 12: 5 white, 0 black
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[5, 0], // Point 17: 5 white, 0 black
			[3, 0], // Point 18: 3 white, 0 black
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 5], // Point 22: 0 white, 5 black
			[5, 0]  // Point 23: 5 white, 0 black
		],
		bar: [0, 0],
		home: [0, 0],
		up: [0],
		dice: []
	};
}

// Roll dice
export function roll(next) {
  return function(state) {
    const isValid = next && next.length === 2 && next.every(v => v >= 1 && v <= 6);
    let dice = isValid ? next : [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    if (dice[0] === dice[1]) {
      dice = [dice[0], dice[0], dice[0], dice[0]];
    }
    return {
      ...state,
      dice: dice
    };
  };
}

// Move function
export function move(slot, count) {
  return function(state) {
    const { dice, points, up } = state;
    const player = up[0];
    const direction = player === WHITE ? 1 : -1;
    const targetSlot = slot + count * direction;

    const diceIndex = dice.indexOf(count);
    if (diceIndex === -1) {
      return state;
    }

    const newPoints = [...points];
    const sourcePoint = [...newPoints[slot]];
    const targetPoint = [...newPoints[targetSlot]];

    if (sourcePoint[player] < 1) {
      return state;
    }

    const opponent = 1 - player;
    if (targetPoint[opponent] > 1) {
      return state;
    }

    sourcePoint[player]--;
    targetPoint[player]++;

    if (targetPoint[opponent] === 1) {
      targetPoint[opponent]--;
      // state.bar[opponent]++;
    }

    newPoints[slot] = sourcePoint;
    newPoints[targetSlot] = targetPoint;

    const newDice = [...dice];
    newDice.splice(diceIndex, 1);

    return {
      ...state,
      points: newPoints,
      dice: newDice
    };
  };
}

export function moves(state) {
  const { points, up, dice } = state;
  const player = up[0];
  const opponent = 1 - player;
  const direction = player === WHITE ? 1 : -1;

  return _.mapcat(function(die) {
    return _.compact(_.map(function(point) {
      const targetSlot = point + die * direction;
      if (targetSlot >= 0 && targetSlot < 24 && points[point][player] > 0 && points[targetSlot][opponent] <= 1) {
        return [point, die];
      }
    }, _.range(24)));
  }, _.unique(dice));
}
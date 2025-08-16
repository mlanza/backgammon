import _ from './libs/atomic_/core.js';

const WHITE = 0;
const BLACK = 1;

// Initial board setup
export function init() {
	return {
		up: [0],
    bar: [0, 0],
		home: [0, 0],
		dice: [],
		points: [
			[2, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 5],

			[0, 0],
			[0, 3],
			[0, 0],
			[0, 0],
			[0, 0],
			[5, 0],

			[0, 5],
			[0, 0],
			[0, 0],
			[0, 0],
			[3, 0],
			[0, 0],

			[5, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 2]
		]
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
    const { bar, dice, points, up } = state;
    const player = up[0];
    const opponent = opposition(player);
    const direction = directed(player);
    const targetSlot = slot + count * direction;

    const diceIndex = dice.indexOf(count);
    if (diceIndex === -1) {
      return state;
    }

    const isBarMove = slot === 24 || slot === -1;

    const newPoints = [...points];
    const newBar = [...bar];

    if (isBarMove) {
      if (newBar[player] < 1) return state;
    } else {
      if (newPoints[slot][player] < 1) return state;
    }

    const targetPoint = [...newPoints[targetSlot]];
    if (targetPoint[opponent] > 1) {
      return state;
    }

    if (isBarMove) {
      newBar[player]--;
    } else {
      const sourcePoint = [...newPoints[slot]];
      sourcePoint[player]--;
      newPoints[slot] = sourcePoint;
    }

    targetPoint[player]++;

    if (targetPoint[opponent] === 1) {
      targetPoint[opponent]--;
      newBar[opponent]++;
    }

    newPoints[targetSlot] = targetPoint;

    const newDice = [...dice];
    newDice.splice(diceIndex, 1);

    return {
      ...state,
      bar: newBar,
      points: newPoints,
      dice: newDice
    };
  };
}

function barEntry(player){
  return player === WHITE ? [24] : [-1];
}

function directed(player) {
  return player === WHITE ? 1 : -1;
}

function opposition(player){
  return player === WHITE ? BLACK : WHITE;
}

function bounds(point){
  return point >= 0 && point < 24;
}

export function moves(state) {
  const { bar, points, up, dice } = state;
  const player = up[0];
  const opponent = opposition(player);
  const direction = directed(player);
  const onBar = bar[player] > 0;

  return _.mapcat(function(die) {
    return _.compact(_.map(function(from) {
      const to = from + die * direction;
      const present = onBar || points[from][player] > 0;
      const open = bounds(to) ? points[to][opponent] <= 1 : false;
      if (present && open) {
        return [from, die];
      }
    }, onBar ? barEntry(player) : _.range(24)));
  }, _.unique(dice));
}

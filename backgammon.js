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
    const { bar, dice, home, points, up } = state;
    const player = up[0];
    const opponent = opposition(player);
    const direction = directed(player);
    const targetSlot = slot + count * direction;

    if (dice.indexOf(count) === -1) {
      throw new Error(`That die is not available.`);
    }

    const isBarMove = !bounds(slot);
    const isBearOff = !bounds(targetSlot);

    if (isBarMove) {
      if (bar[player] < 1) throw new Error("No checker is on the bar.");
    } else {
      if (points[slot][player] < 1) throw new Error(`No checker exists at point ${slot}.`);
    }

    if (!isBearOff){
      const targetPoint = points[targetSlot];
      if (targetPoint[opponent] > 1) {
        throw new Error(`That point — ${targetSlot} — is blocked.`);
      }
    }

    const newPoints = [...points];
    const newBar = [...bar];
    const newHome = [...home];

    if (isBarMove) {
      newBar[player]--;
    } else {
      const sourcePoint = [...newPoints[slot]];
      sourcePoint[player]--;
      newPoints[slot] = sourcePoint;
    }

    if (isBearOff) {
      newHome[player]++;
    } else {
      const newTargetPoint = [...newPoints[targetSlot]];
      if (newTargetPoint[opponent] === 1) {
        newTargetPoint[opponent] = 0;
        newBar[opponent]++;
      }
      newTargetPoint[player]++;
      newPoints[targetSlot] = newTargetPoint;
    }

    const newDice = [...dice];
    newDice.splice(dice.indexOf(count), 1);

    return {
      ...state,
      bar: newBar,
      home: newHome,
      points: newPoints,
      dice: newDice
    };
  };
}

export function commit() {
  return function(state) {
    return {
      ...state,
      up: [opposition(state.up[0])],
      dice: []
    };
  };
}

export function hasWon(state, player) {
  return state.home[player] === 15;
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

function canBearOff(state, player) {
  const { points, bar } = state;
  if (bar[player] > 0) {
    return false;
  }
  const awayRange = player === WHITE ? _.range(0, 18) : _.range(6, 24);
  for (const i of awayRange) {
    if (points[i][player] > 0) {
      return false; // Found a checker outside the home board
    }
  }
  return true;
}

export function moves(state) {
  const { bar, points, up, dice } = state;
  const player = up[0];
  const opponent = opposition(player);
  const direction = directed(player);
  const onBar = bar[player] > 0;

  if (canBearOff(state, player)) {
    const homePoints = player === WHITE ? _.range(18, 24) : _.range(0, 6);
    return _.mapcat(function(die) {
      return _.compact(_.map(function(from) {
        if (points[from][player] > 0) {
          const to = from + die * direction;
          if (!bounds(to)) { // Bearing off
            const highestOccupied = player === WHITE ? _.findLast(p => points[p][player] > 0, homePoints) : _.find(p => points[p][player] > 0, homePoints);
            if (from === highestOccupied || (player === WHITE ? from + die > 23 : from - die < 0)) {
               return {type: "move", details: {from, die}};
            }
          } else if (points[to][opponent] <= 1) { // Regular move in home
            return {type: "move", details: {from, die}};
          }
        }
      }, homePoints));
    }, _.unique(dice));
  }

  return _.mapcat(function(die) {
    return _.compact(_.map(function(from) {
      const to = from + die * direction;
      const present = onBar || points[from][player] > 0;
      const open = bounds(to) ? points[to][opponent] <= 1 : false;
      if (present && open) {
        return {type: "move", details: {from, die}};
      }
    }, onBar ? barEntry(player) : _.range(24)));
  }, _.unique(dice));
}

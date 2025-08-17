import _ from './libs/atomic_/core.js';

const WHITE = 0;
const BLACK = 1;

export function init() {
	return {
		up: 0,
		dice: [],
    rolled: false,
    bar: [0, 0],
		home: [0, 0],
		points: [
			[2, 0], [0, 0], [0, 0],	[0, 0],	[0, 0],	[0, 5],
			[0, 0],	[0, 3],	[0, 0],	[0, 0],	[0, 0],	[5, 0],
			[0, 5],	[0, 0],	[0, 0],	[0, 0],	[3, 0],	[0, 0],
			[5, 0],	[0, 0],	[0, 0],	[0, 0],	[0, 0],	[0, 2]
		]
	};
}

export function roll(next) {
  const rolled = true;
  return function(state) {
    const isValid = next && next.length === 2 && next.every(v => v >= 1 && v <= 6);
    let dice = isValid ? next : [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    if (dice[0] === dice[1]) {
      dice = [dice[0], dice[0], dice[0], dice[0]];
    }
    return {
      ...state,
      rolled,
      dice
    };
  };
}

export function move(slot, count) {
  return function(state) {
    const { bar, dice, home, points, up } = state;
    const seat = up;
    const opponent = opposition(seat);
    const direction = directed(seat);
    const targetSlot = slot + count * direction;

    if (dice.indexOf(count) === -1) {
      throw new Error(`That die is not available.`);
    }

    const isBarMove = !bounds(slot);
    const isBearOff = !bounds(targetSlot);

    if (isBarMove) {
      if (bar[seat] < 1) throw new Error("No checker is on the bar.");
    } else {
      if (points[slot][seat] < 1) throw new Error(`No checker exists at point ${slot}.`);
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
      newBar[seat]--;
    } else {
      const sourcePoint = [...newPoints[slot]];
      sourcePoint[seat]--;
      newPoints[slot] = sourcePoint;
    }

    if (isBearOff) {
      newHome[seat]++;
    } else {
      const newTargetPoint = [...newPoints[targetSlot]];
      if (newTargetPoint[opponent] === 1) {
        newTargetPoint[opponent] = 0;
        newBar[opponent]++;
      }
      newTargetPoint[seat]++;
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

const enter = move;
const bearOff = move;

export function commit() {
  return function(state) {
    const {up} = state;
    return {
      ...state,
      up: opposition(up),
      rolled: false,
      dice: []
    };
  };
}

export function hasWon(state, seat) {
  return state.home[seat] === 15;
}

export function barEntry(seat){
  return seat === WHITE ? [24] : [-1];
}

export function directed(seat) {
  return seat === WHITE ? 1 : -1;
}

export function opposition(seat){
  return seat === WHITE ? BLACK : WHITE;
}

export function bounds(point){
  return point >= 0 && point < 24;
}

export function home(seat){
  return seat === WHITE ? _.range(18, 24) : _.range(0, 6);
}

function available(to, opponent, points){
  return bounds(to) && points[to][opponent] <= 1;
}

function attack(to, opponent, points){
  return bounds(to) && points[to][opponent] === 1;
}

export function canBearOff(state, seat) {
  const { points, bar } = state;
  if (bar[seat] > 0) {
    return false;
  }
  const homePoints = home(seat);
  for (const i of homePoints) {
    if (points[i][seat] > 0) {
      return false; // Found a checker outside the home board
    }
  }
  return true;
}

export function moves(state) {
  const { bar, rolled, points, up, dice } = state;
  const seat = up;
  const opponent = opposition(seat);
  const direction = directed(seat);
  const onBar = bar[seat] > 0;
  const pending = rolled && _.count(dice) > 0;

  if (hasWon(state, WHITE) || hasWon(state, BLACK)) {
    return [];
  }

  if (!rolled) {
    return [{type: "roll", seat}];
  }

  const barMoves = onBar ? _.mapcat(function(die) {
    return _.compact(_.map(function(from) {
      const to = from + die * direction;
      const open = available(to, opponent, points);
      if (open) {
        const capture = attack(to, opponent, points);
        return {type: "enter", details: {from, to, capture, die}, seat};
      }
    }, barEntry(seat)));
  }, _.unique(dice)) : [];

  const bearOffMoves = canBearOff(state, seat) ? _.mapcat(function(die) {
    const homePoints = home(seat);
    return _.compact(_.map(function(from) {
      if (points[from][seat] > 0) {
        const to = from + die * direction;
        if (!bounds(to)) { // Bearing off
          const highestOccupied = _.detect(p => points[p][seat] > 0, seat === WHITE ? _.reverse(homePoints) : homePoints);
          if (from === highestOccupied || (seat === WHITE ? from + die > 23 : from - die < 0)) {
            return {type: "bear-off", details: {from, die}, seat};
          }
        } else if (points[to][opponent] <= 1) { // Regular move in home
          return {type: "move", details: {from, to, die}, seat};
        }
      }
    }, homePoints));
  }, _.unique(dice)) : [];

  const regularMoves = _.mapcat(function(die) {
    return _.compact(_.map(function(from) {
      const to = from + die * direction;
      const present = points[from][seat] > 0; // Simplified: no 'onBar' check here
      const open = available(to, opponent, points);
      if (present && open) {
        const capture = attack(to, opponent, points);
        return {type: "move", details: {from, to, capture, die}, seat};
      }
    }, _.range(24)));
  }, _.unique(dice));

  const moves = onBar ? barMoves : _.concat(bearOffMoves, regularMoves);
  const blocked = _.count(moves) === 0 && pending;

  if (blocked || (rolled && !pending)) {
    return [{type: "commit", seat}];
  }

  return moves;
}

import _ from './libs/atomic_/core.js';
import g from './libs/game_.js';

const WHITE = 0;
const BLACK = 1;

export function Backgammon(seats, config, events, state){
  this.seats = seats;
  this.config = config;
  this.events = events;
  this.state = state;
}

export function backgammon(seats, config = {}, events = [], state = null){
  const {raiseStakes = false} = config;
  const self = new Backgammon(_.toArray(seats), config, [], state || init(raiseStakes));
  return _.reduce(fold, self, events);
}

export function init(raiseStakes) {
	return _.merge({
		up: 0,
    stakes: 1,
    status: "pending",
		dice: [],
    rolled: false,
    bar: [0, 0],
		off: [0, 0],
		points: [
			[2, 0], [0, 0], [0, 0],	[0, 0],	[0, 0],	[0, 5],
			[0, 0],	[0, 3],	[0, 0],	[0, 0],	[0, 0],	[5, 0],
			[0, 5],	[0, 0],	[0, 0],	[0, 0],	[3, 0],	[0, 0],
			[5, 0],	[0, 0],	[0, 0],	[0, 0],	[0, 0],	[0, 2]
		]
	}, raiseStakes ? {holdsCube: -1} : {});
}

function rolled(state, details) {
  let { dice } = details;
  if (dice[0] === dice[1]) {
    dice = [dice[0], dice[0], dice[0], dice[0]];
  }
  return {
    ...state,
    status: "started",
    rolled: true,
    dice
  };
}

function moved(state, details) {
  const { from, die } = details;
  let { to } = details;
  const { bar, dice, off, points, up } = state;
  const seat = up;
  const opponent = opposition(seat);
  const direction = directed(seat);

  if (to == null) {
    to = from + die * direction;
  }

  const newPoints = [...points];
  const newBar = [...bar];
  const newOff = [...off];

  const isBarMove = !bounds(from);
  const isBearOff = !bounds(to);

  if (isBarMove) {
    newBar[seat]--;
  } else {
    const sourcePoint = [...newPoints[from]];
    sourcePoint[seat]--;
    newPoints[from] = sourcePoint;
  }

  if (isBearOff) {
    newHome[seat]++;
  } else {
    const newTargetPoint = [...newPoints[to]];
    if (newTargetPoint[opponent] === 1) {
      newTargetPoint[opponent] = 0;
      newBar[opponent]++;
    }
    newTargetPoint[seat]++;
    newPoints[to] = newTargetPoint;
  }

  const newDice = [...dice];
  newDice.splice(dice.indexOf(die), 1);

  return {
    ...state,
    bar: newBar,
    off: newOff,
    points: newPoints,
    dice: newDice
  };
}

function committed(state) {
  const { up } = state;
  return {
    ...state,
    up: opposition(up),
    rolled: false,
    dice: [],
    status: "started"
  };
}

function doubleProposed(state) {
  const { up } = state;
  return {
    ...state,
    status: "double-proposed",
    up: opposition(up)
  };
}

function accepted(state, details) {
  const { seat } = details;
  return {
    ...state,
    stakes: state.stakes * 2,
    holdsCube: seat,
    status: "started"
  };
}

function forfeited(state, details) {
  const { seat } = details;
  const winner = opposition(seat);
  return {
    ...state,
    status: "finished",
    winner: winner
  };
}

export function hasWon(state, seat) {
  return state.off[seat] === 15;
}

export function validate({state}) {
  const { bar, off, points } = state;
  const whiteCheckers =
    bar[WHITE] +
    off[WHITE] +
    _.reduce((sum, point) => sum + point[WHITE], 0, points);
  const blackCheckers =
    bar[BLACK] +
    off[BLACK] +
    _.reduce((sum, point) => sum + point[BLACK], 0, points);
  return whiteCheckers === 15 && blackCheckers === 15;
}

export function barEntry(seat){
  return seat === WHITE ? [-1] : [24];
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

export function innerBoard(seat){
  return seat === WHITE ? _.range(18, 24) : _.range(0, 6);
}
export function outerBoard(seat){
  return seat === WHITE ? _.range(0, 18) : _.range(6, 24);
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
  return !_.detect(function(i){
    return points[i][seat] > 0;
  }, outerBoard(seat));
}

export function moves(self, options = {}) {
  const state = _.deref(self);
  const { bar, rolled, points, up, dice, stakes, holdsCube } = state;

  const playersToConsider = typeof options.seat === 'number' ? [options.seat] : options.seat || [up];

  const allGeneratedMoves = _.mapcat(function(seat) { // Iterate over each seat
    const opponent = opposition(seat);
    const direction = directed(seat);
    const onBar = bar[seat] > 0;
    const pending = rolled && _.count(dice) > 0;

    if (hasWon(state, WHITE) || hasWon(state, BLACK)) {
      return [];
    }

    if (state.status === "double-proposed") {
      const canRespond = seat === up;
      const responseMoves = canRespond ? [{type: "accept", seat}, {type: "forfeit", seat}] : [];
      return responseMoves;
    }

    if (!rolled) {
      const canDouble = _.has(state, "holdsCube") && stakes < 64 && (holdsCube === -1 || holdsCube === seat);
      const doubleMove = canDouble ? [{type: "propose-double", seat}] : [];
      return _.concat([{type: "roll", seat}], doubleMove);
    }

    const barMoves = onBar ? _.mapcat(function(die) {
      return _.compact(_.map(function(from) {
        const to = from + die * direction;
        const open = available(to, opponent, points);
        if (open) {
          //const capture = attack(to, opponent, points);
          return {type: "enter", details: {from, to, die}, seat};
        }
      }, barEntry(seat)));
    }, _.unique(dice)) : [];

    const bearOffMoves = canBearOff(state, seat) ? _.mapcat(function(die) {
      const inner = _.toArray(innerBoard(seat));
      return _.compact(_.map(function(from) {
        if (points[from][seat] > 0) {
          const to = from + die * direction;
          if (!bounds(to)) { // Bearing off
            const exactFrom = seat === WHITE ? 24 - die : die - 1;
            if (from === exactFrom) {
              return {type: "bear-off", details: {from, die}, seat};
            }
            const higherPoints = seat === WHITE ? _.range(exactFrom + 1, 24) : _.range(0, exactFrom);
            const hasHigherCheckers = _.some(p => points[p][seat] > 0, higherPoints);
            if (!hasHigherCheckers) {
              const highestOccupied = _.detect(p => points[p][seat] > 0, seat === WHITE ? _.reverse(homePoints) : homePoints);
              if (from === highestOccupied) {
                return {type: "bear-off", details: {from, die}, seat};
              }
            }
          } else if (available(to, opponent, points)) { // Regular move in innerBoard
            return {type: "move", details: {from, to, die}, seat};
          }
        }
      }, inner));
    }, _.unique(dice)) : [];

    const regularMoves = _.mapcat(function(die) {
      return _.compact(_.map(function(from) {
        const to = from + die * direction;
        const present = points[from][seat] > 0; // Simplified: no 'onBar' check here
        const open = available(to, opponent, points);
        if (present && open) {
          return {type: "move", details: {from, to, die}, seat};
        }
      }, _.range(24)));
    }, _.unique(dice));

    const moves = onBar ? barMoves : _.concat(bearOffMoves, regularMoves);
    const blocked = _.count(moves) === 0 && pending;

    if (blocked || (rolled && !pending)) {
      return [{type: "commit", seat}];
    }

    return moves;
  }, playersToConsider);

  // Filter by type if options.type is provided
  if (options.type) {
    const typesToFilter = typeof options.type === 'string' ? [options.type] : options.type;
    return _.filtera(move => _.includes(typesToFilter, move.type), allGeneratedMoves);
  }

  return allGeneratedMoves;
}

function compact(self){
  return new Backgammon(self.seats,
    self.config,
    [],
    self.state);
}

function append(self, event){
  return new Backgammon(self.seats,
    self.config,
    _.append(self.events, event),
    self.state);
}

function fmap(self, f){
  return new Backgammon(self.seats,
    self.config,
    self.events,
    f(self.state));
}

function noDetails(command){
  const {details} = command;
  return _.eq(details, {}) ? _.dissoc(command, "details") : command;
}

const validDie = _.includes(_.range(1, 7), _);

export function execute(self, command) {
  const { state } = self;
  const { status } = state;
  const { type, seat } = command;

  switch (status) {
    case "pending":
      if (type != "roll" && type != "propose-double") {
        throw new Error(`Command not allowed in current status`);
      }
      break;
    case "started":
      if (type == "roll" && state.rolled) {
        throw new Error(`Cannot roll dice again.`);
      }
      break;
    case "double-proposed":
      if (type != "accept" && type != "forfeit") {
        throw new Error(`Command not allowed in current status`);
      }
      if (seat !== state.up) {
        throw new Error("Not your turn");
      }
      break;
    case "finished":
      throw new Error(`Cannot issue commands once the game is finished.`);
      break;
  }

  // Specific validation for propose-double
  if (type === "propose-double") {
    if (state.stakes >= 64) {
      throw new Error("Cannot double at stakes of 64 or higher");
    }
    if (state.holdsCube !== -1 && state.holdsCube !== seat) {
      throw new Error("You do not control the cube");
    }
  }

  const allValidMoves = g.moves(self, {seat, type});

  const cmd = _.chain(command, _.compact, _.dissoc(_, "id"), _.dissocIn(_, ["details", "dice"]), noDetails);

  if (!_.detect(_.eq(_, cmd), allValidMoves)) {
    throw new Error(`Invalid command: ${JSON.stringify(command)}`);
  }

  switch (command.type) {
    case 'roll': {
      const dice = command.details.dice || [_.randInt(6), _.randInt(6)];
      const [a, b] = dice;
      if (!validDie(a) || !validDie(b)) {
        throw new Error("Invalid dice");
      }
      return g.fold(self,
        _.chain(command,
          _.assoc(_, "type", "rolled"),
          _.assocIn(_, ["details", "dice"], dice)));
    }
    case 'enter':
    case 'move': {
      const { from, to, die } = command.details;
      const { bar, dice, points, up } = state;
      const seat = up; // This 'seat' is already defined from 'command.seat' above, but keeping for clarity
      const opponent = opposition(seat);
      const direction = directed(seat);

      // These checks are now redundant if 'matched' is true, as 'moves' function already validates them.
      // However, keeping them for now as they are part of the original logic.
      if (dice.indexOf(die) === -1) {
        throw new Error(`That die is not available.`);
      }

      const isBarMove = !bounds(from);
      if (isBarMove) {
        if (bar[seat] < 1) {
          throw new Error("No checker is on the bar.");
        }
      } else {
        if (points[from][seat] < 1) {
          throw new Error(`No checker exists at point ${from}.`);
        }
      }

      if (bounds(to)) {
        const targetPoint = points[to];
        if (targetPoint[opponent] > 1) {
          throw new Error(`That point — ${to} — is blocked.`);
        }
      }

      const capture = attack(to, opponent, points);
      return g.fold(self,
        _.chain(command,
          _.assoc(_, "type", type == "move" ? "moved" : "entered"),
          _.assocIn(_, ["details", "capture"], capture)));
    }
    case 'commit': {
      return g.fold(self, _.assoc(command, "type", "committed"));
    }
    case 'propose-double': {
      return g.fold(self, _.assoc(command, "type", "double-proposed"));
    }
    case 'accept': {
      return g.fold(self, _.assoc(command, "type", "accepted"));
    }
    case 'forfeit': {
      return g.fold(self, _.assoc(command, "type", "forfeited"));
    }
    default: {
      throw new Error("Unknown command: " + command.type);
    }
  }
}

function fold(self, event) {
  const state = _.deref(self);
  switch (event.type) {
    case "rolled":
      return g.fold(self, event, state => rolled(state, event.details));
    case "entered":
    case "moved":
      return g.fold(self, event, state => moved(state, event.details))
    case "committed":
      return g.fold(self, event, state => committed(state, event.details))
    case "double-proposed":
      return g.fold(self, event, state => doubleProposed(state, event.details))
    case "accepted":
      return g.fold(self, event, state => accepted(state, event.details))
    case "forfeited":
      return g.fold(self, event, state => forfeited(state, event.details))
    default:
      return self;
  }
}

function perspective(self, seen) {
  return self.state;
}

function up(state) {
  return [state.up];
}

const may = up;

function metrics(state, seat) {
  return {};
}

function comparator(s1, s2) {
  return 0;
}

function textualizer(event) {
  return "";
}

function undoable(){
  return true;
}

function status(self) {
  const { state } = self;
  if (hasWon(state, WHITE) || hasWon(state, BLACK)) {
    return "finished";
  } else if (state.status === "pending" && state.dice.length === 0 && state.bar[WHITE] === 0 && state.bar[BLACK] === 0 && state.innerBoard[WHITE] === 0 && state.innerBoard[BLACK] === 0) {
    return "pending";
  } else {
    return "started";
  }
}

_.doto(Backgammon,
  g.behave,
  _.implement(_.ICompactible, {compact}),
  _.implement(_.IAppendable, {append}),
  _.implement(_.IFunctor, {fmap}),
  _.implement(g.IGame, {perspective, up, may, moves, undoable, metrics, comparator, textualizer, fold, status}));

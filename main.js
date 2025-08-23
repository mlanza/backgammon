import _ from './libs/atomic_/core.js';
import $ from './libs/atomic_/shell.js';
import * as b from './core.js';
import {reg} from './libs/cmd.js';

const $game = $.atom(b.backgammon([0,1], {raiseStakes: true}), {validate: b.validate});

function exec($game, command) {
  $.swap($game, (g) => b.execute(g, command));
}

const moves = _.pipe(_.deref, b.moves, _.toArray, $.see("moves"));
reg({$game, moves, b, exec});

exec($game, {type: 'roll', seat: 0, details: {dice: [5, 6]}});
exec($game, {type: 'move', seat: 0, details: {from: 11, to: 16, die: 5}});
exec($game, {type: 'move', seat: 0, details: {from: 0, to: 6, die: 6}});
exec($game, {type: 'commit', seat: 0});

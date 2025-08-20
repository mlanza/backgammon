import _ from './libs/atomic_/core.js';
import $ from './libs/atomic_/shell.js';
import * as b from './core.js';
import {reg} from './libs/cmd.js';

const $game = $.atom(b.backgammon([0,1]));
let gameOver = false;

function verify(state) {
  if (!b.verify(state)) {
    console.error("Verification failed", state);
  }
}

function exec($game, command) {
  if (gameOver) {
    return;
  }
  const game = _.deref($game);

  const newGame = b.execute(game, command);

  if (newGame) {
    $.swap($game, (g) => newGame);
    verify(newGame.state);
    if (b.hasWon(newGame.state, newGame.state.up)) {
      console.log(`Game over! Player ${newGame.state.up} has won.`);
      gameOver = true;
    }
  }
}

const moves = _.pipe(_.deref, (g) => b.moves(g.state), _.toArray, $.see("moves"));
reg({$game, moves, b, exec});

exec($game, {type: 'roll', seat: 0, details: {dice: [5, 6]}});
exec($game, {type: 'move', seat: 0, details: {from: 11, to: 6}});
exec($game, {type: 'move', seat: 0, details: {from: 16, to: 10}});
exec($game, {type: 'commit', seat: 0, details: {}});
exec($game, {type: 'roll', seat: 1, details: {dice: [6, 6]}});
exec($game, {type: 'move', seat: 1, details: {from: 7, to: 13}});
exec($game, {type: 'move', seat: 1, details: {from: 7, to: 13}});
exec($game, {type: 'move', seat: 1, details: {from: 12, to: 18}});
exec($game, {type: 'move', seat: 1, details: {from: 12, to: 18}});
exec($game, {type: 'commit', seat: 1, details: {}});
exec($game, {type: 'roll', seat: 0, details: {dice: [6, 1]}});
exec($game, {type: 'move', seat: 0, details: {from: 11, to: 5}});
exec($game, {type: 'move', seat: 0, details: {from: 17, to: 16}});
exec($game, {type: 'commit', seat: 0, details: {}});

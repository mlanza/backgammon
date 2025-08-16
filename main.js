import _ from './libs/atomic_/core.js';
import $ from './libs/atomic_/shell.js';
import * as b from './backgammon.js';
import {reg} from './libs/cmd.js';

const $state = $.atom(b.init());
const moves = _.pipe(_.deref, b.moves, _.toArray, $.see("moves"));

reg({$state, moves});

$.swap($state, b.roll([5, 6]));
$.swap($state, b.move(11, 5));
$.swap($state, b.move(11, 6));
$.swap($state, b.commit());
$.swap($state, b.roll([6, 1]));
$.swap($state, b.move(23, 6));
$.swap($state, b.move(5, 1));
$.swap($state, b.commit());
$.swap($state, b.roll([3, 4]));
$.swap($state, b.move(24, 3));
$.swap($state, b.move(11, 4));
$.swap($state, b.commit());
$.swap($state, b.roll([5, 5]));
$.swap($state, b.move(7, 5));
$.swap($state, b.move(7, 5));
$.swap($state, b.move(7, 5));
$.swap($state, b.move(12, 5));
$.swap($state, b.commit());
$.swap($state, b.roll([1, 6]));
$.swap($state, b.move(0, 6));
$.swap($state, b.move(0, 1));
$.swap($state, b.commit());
$.swap($state, b.roll([3, 4]));
moves($state);

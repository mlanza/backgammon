import _ from './libs/atomic_/core.js';
import $ from './libs/atomic_/shell.js';
import * as b from './backgammon.js';
import {reg} from './libs/cmd.js';

const $state = $.atom(b.init());

reg({$state});

$.swap($state, b.roll([5, 6]));
$.swap($state, b.move(11, 5));
_.chain($state, _.deref, b.moves, _.toArray, $.log);

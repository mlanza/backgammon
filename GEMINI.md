# Backgammon
A web application for playing backgammon.

## Overview
* Use the Atomic way to design and maintain the application.  That way is described in docs in its repo (https://github.com/mlanza/atomic).
* All programs start as simulations.  Initialize the contents of the program's one atom in `main.js`—instantiated with `$.atom`—with `init` from the core module.  That's the first function to be written.  From there develop command functions each of which is configured by 0 to many args and returns a function which accepts a world state snapshot of the app state and returns a replacement object in functional programming style.  In this way, the initial stage of development is deciding what commands are necessary to apply the effects needed to move the app state forward.  All of these commands will be functions added to the core module.
* If you're aware of the domain being modeled (e.g., Backgammon) feel free to suggest which command to implement next.  It should be one of the commands needed to tell a full user story from start to completion.  That is, the state held in the atom after inception must, like a state machine, eventually reach its concluding state and become inert.
* Keep to a functional core, imperative shell architecture.  This is neatly divided with the former logic kept in `backgammon.js` and the latter in `main.js`.
* Leave the UI logic untouched.  This constraint will be dropped when the time comes.
* The `_` imported from `.\libs\atomic_\core.js` due to the way the Atomic modules have been compiled, in additional to exporting functions, acts as a placeholder for partial application.  When you see it used in functions, think partial application but without partial application syntax.
* Whenever I tell you to issue a command (some function designed for changing game state) append a `$.swap($state, ...)` to the `main.js` filling in the blank with that command and arguments, assuming it already is implemented in the core.  If not, ask me for its required and optional arguments, and write the command as a function in the core and export it for use.
* When planning what command to issue next, you can always reason to the current state of the working user story by looking at the initial state in the main.js and the commands to follow.

## Files (work in progress)
* `.\backgammon.js`: The core module, pure code only, all functions are referrentially transparent.
* `.\main.js`: The imperative shell, all side effects are realized here.
* `.\index.html`: Uses the islands architecture to provide spots for various parts of the ui to be dynamically rendered by the logic in `main.js`.

## Vendor Files (do not touch)
* `.\libs\atomic_\core.js`: The pure module used to develop functional core logic.
* `.\libs\atomic_\shell.js`: The effectful module with tools for developing imperative shells.
* `.\libs\atomic_\dom.js`: The effectful module with tools for interacting with the dom.

## Commands
* Build: `npm run build`
* Test: `npm run test`

# Gemini Configuration

## Project Description

A web application for playing backgammon.

## Goals

* Use the Atomic (https://github.com/mlanza/atomic) way to design and maintain the application.  That way is described in docs on the site.
* Start by simulating things.  Initialize the contents of the program's one atom—instantiated with `$.atom`—with the `init` from the core module.  Then develop functions each of which is configured by 0 to many args and returns a function which accepts a world state snapshot of the app state and returns a replacement object in functional programming style.  In this way, the initial stage of development is deciding what commands are necessary to apply the effects needed to move the app state forward.  All of these commands will be functions added to the core module.
* Keep to a functional core, imperative shell architecture.  This is neatly divided with the former logic kept in `backgammon.js` and the latter in `main.js`.
* Until stated otherwise, the UI logic is to be left untouched.  The UI won't be started until the core has been well developed.
* The `_` imported from `.\libs\atomic_\core.js` due to the way the Atomic modules have been compiled acts as a placeholder for partial application.  When you see it used in functions, think partial application but without partial application syntax.
* Whenever I explain how to implement a command (some function designed for changing game state) I will normally provide sample arguments.  From this, you can infer how to write the function.  You can also update the `main.js` by appending a `$.swap($state, ...)` which fills in the intentional blank with that function and args (e.g., the actual command).  Recall that invoking a command function returns a function which receives and updates the app state.  In this way, each issued command will be appended to the main module during the initial phase of development.

## Key Files

* `.\libs\atomic_\core.js`: the primarily pure library used to develop functional core logic; this is third party and must not be modified.
* `.\libs\atomic_\shell.js`: the primarily effectful library used to develop imperative shells; this is third party and must not be modified.
* `.\libs\atomic_\dom.js`: the primarily effectful library for interacting with the dom; this is third party and must not be modified.  It is only used after the core has been completed.
* `.\backgammon.js`: the core module, pure code only, all functions are referrentially transparent.
* `.\main.js`: the imperative shell, all messy, stateful interactions go here
* `.\index.html`: uses the islands architecture to provide spots for various parts of the ui to be dynamically rendred

## Commands

*   Build: `npm run build`
*   Test: `npm run test`

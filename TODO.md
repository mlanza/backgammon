# TODO - Next Steps

This plan outlines the next steps to make the simulation more robust and move towards a playable game.

- [x] **1. Refactor Commands and Events:**
  - **Goal:** Align all commands and events with the preferred naming and structure.
  - **Commands:** Rename to `roll`, `move`, `bear-off`, `enter`.
  - **Events:** Rename to `rolled`, `moved`, `borne-off`, `entered`.
  - **Structure:** Ensure all commands and events have the structure `{ type, seat, details }`.
  - **`main.js`:** Update the `execute` function and simulation script to use the new command structure.
  - **`backgammon.js`:** Update the `fold` function and command creators to use the new names and structures.

- [x] **2. Add State Verification to Simulation:**
  - Create a `verify(state)` function in `main.js` that asserts certain conditions are met after each move.
  - For example, assert that the number of checkers on the board is always 15 for each player. `b.verify` already exists in `core.js`, I can use it.
  - Add calls to this `verify` function after each `execute` call in the simulation.

- [x] **3. Handle Game Over:**
  - Modify the `execute` function in `main.js` to check for game-over conditions after each event.
  - The `b.hasWon(state, seat)` function can be used.
  - When the game is over, log a message to the console and stop the simulation.

- [ ] **5. Stylistic Refinements (based on `meeplitis/src/libs/game.js`):**
  - [x] **a. Remove `export default` for `backgammon` function:**
    - Change `export default function backgammon(...)` to `function backgammon(...)`.
    - Adjust imports in `main.js` if necessary (e.g., `import { backgammon } from './core.js';` if it's used as a named export, or remove if not used).
  - [x] **b. Review function export consistency:**
    - Ensure all functions intended for external use are `export function`.
    - Ensure internal helper functions are not exported. (Already largely consistent, but a final check).
  - [x] **c. Consider `commands` object structure:**
    - Note that `game.js` handles command types directly within `execute` rather than using a separate `commands` object. (No immediate change, but a point for future discussion/refactoring if desired by the user).

- [x] **6. Reconcile `execute`/`fold` to return modified game object:**
  - Ensure `fold` returns a new `Backgammon` object with updated state and events.
  - Ensure `execute` returns a new `Backgammon` object after applying the command.
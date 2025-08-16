# TODO - Backgammon Simulation

- [x] **Fix bug in `moves` function:** The current implementation has a bug where it tries to access `points` with an invalid index when a player is on the bar.
- [x] **Add validation to `move` command:** An invalid move should throw an exception.
- [x] **Implement `commit` command:** This command signifies the end of a player's turn, switches the seat, and clears the dice.
- [x] **Enhance `move` function:** Correctly handles hitting a blot by updating the opponent's bar count.
- [x] **Update `moves` for bar moves:** Correctly generates moves from the bar, superseding other moves.
- [x] **Implement bearing off logic:**
    - [x] Add `canBearOff` helper function.
    - [x] Update `moves` to generate valid bear-off moves.
    - [x] Update `move` to handle moving checkers to the `home` array.
- [x] **Implement win condition:**
    - [x] Add `hasWon` helper function.
- [ ] **Tell the full story in `main.js`:**
    - [ ] After a player's moves, call `commit`.
    - [ ] Add a move for the second player that hits a blot.
    - [ ] Demonstrate a player being forced to enter from the bar.
    - [ ] Set up a state where a player can bear off.
    - [ ] Demonstrate a player bearing off.
    - [ ] Demonstrate a player winning the game.
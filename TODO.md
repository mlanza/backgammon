# TODO - Doubling Cube Implementation

This plan outlines the steps to implement the doubling cube feature as specified in `prds/DOUBLING.md`.

- [x] **State:** Update `init()` in `core.js` to include `stakes: 1` and `holdsCube: -1`.

## Phase 1: Propose Double
- [x] **Available Moves:** Update `moves` to show `propose-double` as a valid move.
- [x] **Propose Double:** Implement the `propose-double` command in `execute` and the corresponding `double-proposed` event in `fold`.

## Phase 2: Accept
- [ ] **Available Moves:** Update `moves` to show `accept` as a valid move.
- [ ] **Accept:** Implement the `accept` command in `execute` and the corresponding `accepted` event in `fold`.

## Phase 3: Forfeit
- [ ] **Available Moves:** Update `moves` to show `forfeit` as a valid move.
- [ ] **Forfeit:** Implement the `forfeit` command in `execute` and the corresponding `forfeited` event in `fold`.

## Phase 4: Validation and Game Outcome
- [ ] **Validation:** Add validation logic to `execute` to enforce all preconditions and rules for the new commands as described in the PRD.
- [ ] **Game Outcome:** Ensure that a `forfeit` correctly ends the game and assigns a winner.
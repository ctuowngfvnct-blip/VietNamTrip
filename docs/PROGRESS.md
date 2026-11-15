# VietNamTrip – Game Progress

## 1. Overview

This document describes the puzzle game logic and player progress system.

The game uses a 3x3 sliding puzzle. Players complete a province by arranging all tiles into the correct order.

## 2. Puzzle Logic

- The puzzle contains 9 tiles, numbered from 1 to 8 and one empty tile (0).
- The initial solved state is `[1, 2, 3, 4, 5, 6, 7, 8, 0]`.
- Fisher-Yates Shuffle is used to shuffle the puzzle.
- A fixed seed makes the shuffle reproducible.
- Only tiles adjacent to the empty tile can move.
- The game checks whether the puzzle is solved after each valid move.

## 3. Province Unlocking

Provinces are unlocked in the order defined in `data/provinces.json`.

The first province is unlocked by default.

Completing a province unlocks the next province.

The first three provinces are:

1. Lam Dong (`lam_dong`)
2. Tuyen Quang (`tuyen_quang`)
3. Cao Bang (`cao_bang`)

The `is_demo` field in province data does not represent player unlock progress.

## 4. Progress Persistence

Completed province IDs are stored in browser `localStorage` using the key:

`vietnamtrip_progress`

The progress system supports:

- Saving completed provinces.
- Loading saved progress.
- Preventing duplicate completed province IDs.
- Returning an empty list when no valid saved progress exists.

## 5. Game Logic

The main game functions are:

- `startGame()` – starts a game for an unlocked province.
- `playMove()` – processes a tile movement and checks for victory.
- `createPuzzle()` – creates the solved puzzle.
- `shufflePuzzle()` – shuffles the puzzle using a seed.
- `moveTile()` – moves a valid adjacent tile.
- `isPuzzleSolved()` – checks whether the puzzle is complete.

## 6. Testing

Tests are written using Vitest.

Run all tests with:

`npm test`

Current test coverage includes:

- Puzzle creation and shuffling.
- Valid and invalid tile movements.
- Puzzle completion.
- Province unlocking.
- Progress saving and loading.
- Preventing moves after the puzzle is solved.

Latest test result: 25 tests passed.
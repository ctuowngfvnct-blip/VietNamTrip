# VietNamTrip – Testing Guide

## 1. Purpose

This guide explains how to test the puzzle game and province unlocking system.

## 2. Run Automated Tests

Open the terminal in the project folder and run:

```bash
npm test
```

Expected result: All tests pass.

## 3. Manual Testing

### Test 1: Lam Dong

1. Start the game.
2. Select Lam Dong.
3. Check that the 3x3 puzzle appears.
4. Move a tile adjacent to the empty tile.
5. Check that the tile moves correctly.
6. Complete the puzzle.
7. Check that Lam Dong is marked as completed.
8. Check that Tuyen Quang is unlocked.

### Test 2: Tuyen Quang

1. Select Tuyen Quang.
2. Check that the puzzle appears.
3. Complete the puzzle.
4. Check that Tuyen Quang is marked as completed.
5. Check that Cao Bang is unlocked.

### Test 3: Cao Bang

1. Select Cao Bang.
2. Check that the puzzle appears.
3. Complete the puzzle.
4. Check that Cao Bang is marked as completed.

## 4. Invalid Movement Testing

1. Start a puzzle.
2. Select a tile that is not adjacent to the empty tile.
3. Check that the puzzle does not change.

## 5. Progress Persistence Testing

1. Complete a province.
2. Refresh the browser.
3. Check that the completed province remains
4. Check that the next province remains unlocked.

## 6. Expected Results

- Only adjacent tiles can move.
- The game detects when the puzzle is solved.
- Completing a province unlocks the next province.
- Completed progress is saved in localStorage.
- Locked provinces cannot be started.
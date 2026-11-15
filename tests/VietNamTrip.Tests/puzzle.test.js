import { describe, it, expect } from "vitest";
import {
    createPuzzle,
    shufflePuzzle,
    moveTile,
    isPuzzleSolved
} from "../../src/VietNamTrip.Core/puzzle.js";

describe("Puzzle", () => {
    it("should create a solved puzzle", () => {
        const puzzle = createPuzzle();

        expect(puzzle).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    });

    it("should shuffle puzzle correctly", () => {
        const puzzle = shufflePuzzle(12345);

        expect(puzzle).toHaveLength(9);

        expect([...puzzle].sort((a, b) => a - b))
            .toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("should return the same puzzle with the same seed", () => {
    const puzzle1 = shufflePuzzle(12345);
    const puzzle2 = shufflePuzzle(12345);

    expect(puzzle1).toEqual(puzzle2);
    });

    it("should move an adjacent tile correctly", () => {
    const puzzle = [1, 2, 3, 4, 5, 6, 7, 0, 8];

    const result = moveTile(puzzle, 8);

    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    });

    it("should not move a non-adjacent tile", () => {
    const puzzle = [1, 2, 3, 4, 5, 6, 7, 0, 8];

    const result = moveTile(puzzle, 5);

    expect(result).toEqual(puzzle);
    });

    it("should return true when puzzle is solved", () => {
        const puzzle = [1, 2, 3, 4, 5, 6, 7, 8, 0];

        expect(isPuzzleSolved(puzzle)).toBe(true);
    });

    it("should return false when puzzle is not solved", () => {
        const puzzle = [1, 2, 3, 4, 5, 6, 0, 7, 8];

        expect(isPuzzleSolved(puzzle)).toBe(false);
    });

    it("should not move a tile with an invalid index", () => {
        const puzzle = [1, 2, 3, 4, 5, 6, 7, 0, 8];

        const result = moveTile(puzzle, 9);

        expect(result).toEqual(puzzle);
    });
});
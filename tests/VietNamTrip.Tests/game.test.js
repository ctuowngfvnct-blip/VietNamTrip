import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi
} from "vitest";

import {
    startGame,
    playMove
} from "../../src/VietNamTrip.Core/game.js";

beforeEach(() => {
    const storage = new Map();

    vi.stubGlobal("localStorage", {
        setItem(key, value) {
            storage.set(key, String(value));
        },

        getItem(key) {
            return storage.has(key) ? storage.get(key) : null;
        },

        removeItem(key) {
            storage.delete(key);
        },

        clear() {
            storage.clear();
        }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const provinces = [
    { id: "lam_dong", name: "Lâm Đồng" },
    { id: "tuyen_quang", name: "Tuyên Quang" },
    { id: "cao_bang", name: "Cao Bằng" }
];

describe("Game Tests", () => {

    it("should start a game for the first province", () => {
        const game = startGame(provinces, "lam_dong");

        expect(game).not.toBeNull();
        expect(game.provinceId).toBe("lam_dong");
        expect(game.puzzle).toHaveLength(9);
        expect(game.isSolved).toBe(false);
    });

    it("should not start a game for a locked province", () => {
    const game = startGame(provinces, "tuyen_quang");

    expect(game).toBeNull();
});

it("should allow the player to move a valid tile", () => {
    const game = startGame(provinces, "lam_dong", 12345);

    const emptyIndex = game.puzzle.indexOf(0);
    const tileIndex = emptyIndex - 1;

    const updatedGame = playMove(game, tileIndex);

    expect(updatedGame).not.toBe(game);
    expect(updatedGame.puzzle).not.toEqual(game.puzzle);
});

it("should not allow the player to move an invalid tile", () => {
    const game = startGame(provinces, "lam_dong", 12345);

    const emptyIndex = game.puzzle.indexOf(0);

    // Choose a tile that is not next to the empty tile
    const invalidIndex = (emptyIndex + 4) % 9;

    const updatedGame = playMove(game, invalidIndex);

    expect(updatedGame).toBe(game);
    expect(updatedGame.puzzle).toEqual(game.puzzle);
});

it("should complete the province when the puzzle is solved", () => {
    const game = startGame(provinces, "lam_dong");

    // Create a puzzle that needs only one move to solve
    game.puzzle = [1, 2, 3, 4, 5, 6, 7, 0, 8];

    const updatedGame = playMove(game, 8);

    expect(updatedGame.isSolved).toBe(true);
    expect(updatedGame.completedProvinceIds).toContain("lam_dong");
    expect(updatedGame.unlockedProvinceIds).toContain("tuyen_quang");

    // Check whether progress was saved
    expect(
        JSON.parse(localStorage.getItem("vietnamtrip_progress"))
    ).toContain("lam_dong");
});

it("should not allow moves after the puzzle is solved", () => {
    const game = startGame(provinces, "lam_dong");

    game.puzzle = [1, 2, 3, 4, 5, 6, 7, 0, 8];

    const solvedGame = playMove(game, 8);

    const updatedGame = playMove(solvedGame, 7);

    expect(updatedGame).toBe(solvedGame);
});

});
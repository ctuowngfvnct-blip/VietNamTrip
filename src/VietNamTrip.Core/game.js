
import {
    shufflePuzzle,
    moveTile,
    isPuzzleSolved
} from "./puzzle.js";

import {
    getUnlockedProvinceIds,
    completeProvince,
    saveProgress,
    loadProgress
} from "./progress.js";


// Start a game for a province
export function startGame(provinces, provinceId, seed = 12345) {
    const completedProvinceIds = loadProgress();

    const unlockedProvinceIds = getUnlockedProvinceIds(
        provinces,
        completedProvinceIds
    );

    // Check whether the province is unlocked
    if (!unlockedProvinceIds.includes(provinceId)) {
        return null;
    }

    return {
        provinces,
        provinceId,
        puzzle: shufflePuzzle(seed),
        completedProvinceIds,
        unlockedProvinceIds,
        isSolved: false
    };
}


// Move a tile and check whether the puzzle is solved
export function playMove(gameState, tileIndex) {
    if (!gameState || gameState.isSolved) {
        return gameState;
    }

    const newPuzzle = moveTile(gameState.puzzle, tileIndex);

    // No valid movement
    if (newPuzzle === gameState.puzzle) {
        return gameState;
    }

    // Check whether the player has won
    if (isPuzzleSolved(newPuzzle)) {
        const completed = completeProvince(
            gameState.provinceId,
            gameState.completedProvinceIds
        );

        // Save completed provinces
        saveProgress(completed);

        return {
            ...gameState,
            puzzle: newPuzzle,
            completedProvinceIds: completed,
            unlockedProvinceIds: getUnlockedProvinceIds(
                gameState.provinces,
                completed
            ),
            isSolved: true
        };
    }

    return {
        ...gameState,
        puzzle: newPuzzle
    };
}

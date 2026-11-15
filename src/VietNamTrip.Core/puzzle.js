export function createPuzzle() {
    return [1, 2, 3, 4, 5, 6, 7, 8, 0];
}

function countInversions(puzzle) {
    let count = 0;

    for (let i = 0; i < puzzle.length; i++) {
        for (let j = i + 1; j < puzzle.length; j++) {
            if (
                puzzle[i] !== 0 &&
                puzzle[j] !== 0 &&
                puzzle[i] > puzzle[j]
            ) {
                count++;
            }
        }
    }

    return count;
}

function createRandom(seed) {
    let value = seed;

    return function () {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

export function shufflePuzzle(seed = 12345) {
    const puzzle = createPuzzle();
    const random = createRandom(seed);

    for (let i = puzzle.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));

        [puzzle[i], puzzle[j]] = [puzzle[j], puzzle[i]];
    }

    if (countInversions(puzzle) % 2 !== 0) {
        const first = puzzle.indexOf(1);
        const second = puzzle.indexOf(2);

        [puzzle[first], puzzle[second]] =
            [puzzle[second], puzzle[first]];
    }

    return puzzle;
}

export function moveTile(puzzle, tileIndex) {
    if (
    !Number.isInteger(tileIndex) ||
    tileIndex < 0 ||
    tileIndex >= puzzle.length
) {
    return puzzle;
}
    const emptyIndex = puzzle.indexOf(0);

    const row = Math.floor(emptyIndex / 3);
    const col = emptyIndex % 3;

    const tileRow = Math.floor(tileIndex / 3);
    const tileCol = tileIndex % 3;

    const distance =
        Math.abs(row - tileRow) + Math.abs(col - tileCol);

    if (distance !== 1) {
        return puzzle;
    }

    const newPuzzle = [...puzzle];

    [newPuzzle[emptyIndex], newPuzzle[tileIndex]] =
        [newPuzzle[tileIndex], newPuzzle[emptyIndex]];

    return newPuzzle;
}

export function isPuzzleSolved(puzzle) {
    const solvedPuzzle = [1, 2, 3, 4, 5, 6, 7, 8, 0];

    return puzzle.every((value, index) => {
        return value === solvedPuzzle[index];
    });
}
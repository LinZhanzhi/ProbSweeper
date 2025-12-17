import { BoardConfig, CellData, CellState } from '../types';
import { createBoard, revealCell, checkWin, DIRECTIONS } from './minesweeper';
import { getNextBestMove } from './solver';
import { PLAY_STYLE_FLAGS } from './probabilityEngine';

export const generateNoGuessBoard = async (
    config: BoardConfig,
    maxAttempts: number = 10000,
    onProgress?: (status: string) => void
): Promise<{ board: CellData[][], start: { r: number, c: number } } | null> => {
    // Reduce mines slightly for No Guess to make it feasible?
    // Standard minesweeper NG often requires slightly lower density or many attempts.
    // But let's try with standard config first.

    for (let i = 0; i < maxAttempts; i++) {
        const board = createBoard(config);
        recalculateNeighbors(board); // Ensure neighbors are correct

        // Find all safe starts (preferably 0s)
        const zeros: {r: number, c: number}[] = [];
        const nonZeros: {r: number, c: number}[] = [];

        board.forEach(row => row.forEach(cell => {
            if (!cell.isMine) {
                if (cell.neighborMines === 0) {
                    zeros.push({r: cell.row, c: cell.col});
                } else {
                    nonZeros.push({r: cell.row, c: cell.col});
                }
            }
        }));

        if (zeros.length === 0 && nonZeros.length === 0) continue;

        // Optimization: Group connected 0s and only test one from each group
        // This avoids testing multiple start positions that result in the exact same initial board state.
        const uniqueZeroStarts: {r: number, c: number}[] = [];
        if (zeros.length > 0) {
            const visited = new Set<string>();
            const rows = board.length;
            const cols = board[0].length;

            for (const z of zeros) {
                const key = `${z.r},${z.c}`;
                if (visited.has(key)) continue;

                // Found a new group, add representative
                uniqueZeroStarts.push(z);

                // BFS to mark all connected 0s
                const queue = [z];
                visited.add(key);

                while (queue.length > 0) {
                    const curr = queue.shift()!;

                    // Check all 8 neighbors (since 0s chain react on 8-way adjacency)
                    for (const [dr, dc] of DIRECTIONS) {
                        const nr = curr.r + dr;
                        const nc = curr.c + dc;

                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            const nKey = `${nr},${nc}`;
                            if (!visited.has(nKey) && board[nr][nc].neighborMines === 0 && !board[nr][nc].isMine) {
                                visited.add(nKey);
                                queue.push({r: nr, c: nc});
                            }
                        }
                    }
                }
            }
        }

        // Candidates = Unique Zero Starts + All Non-Zero Safe Cells
        // This covers ALL unique opening moves.
        let candidates = [...uniqueZeroStarts, ...nonZeros];

        // Shuffle candidates to avoid bias
        for (let j = candidates.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [candidates[j], candidates[k]] = [candidates[k], candidates[j]];
        }

        // Try to solve from each candidate
        for (let j = 0; j < candidates.length; j++) {
            // Update progress
            if (onProgress && j % 10 === 0) {
                onProgress(`Board ${i + 1}: Checking candidate ${j + 1}/${candidates.length}`);
                await new Promise(r => setTimeout(r, 0)); // Yield to UI
            }

            const start = candidates[j];
            if (await isSolvable(board, start, config.mines)) {
                return { board, start };
            }
        }
    }
    return null;
};

const recalculateNeighbors = (board: CellData[][]) => {
    const rows = board.length;
    const cols = board[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!board[r][c].isMine) {
                let count = 0;
                DIRECTIONS.forEach(([dr, dc]) => {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
                        count++;
                    }
                });
                board[r][c].neighborMines = count;
            }
        }
    }
};

const isSolvable = async (initialBoard: CellData[][], start: {r: number, c: number}, totalMines: number): Promise<boolean> => {
    // Clone board for simulation
    // Deep clone is needed
    let board = JSON.parse(JSON.stringify(initialBoard));

    // Initial reveal
    let result = revealCell(board, start.r, start.c);
    board = result.board;
    if (result.hitMine) return false;

    let progress = true;
    while (progress) {
        progress = false;

        // Check win
        if (checkWin(board)) return true;

        // Use the main solver logic (getNextBestMove)
        // We use PLAY_STYLE_FLAGS (standard) and isCertainMode = true
        // This ensures we ONLY take 100% safe moves or flag 100% mines.
        // No guessing allowed.
        const move = getNextBestMove(board, totalMines, PLAY_STYLE_FLAGS, true);

        if (move) {
            progress = true;
            if (move.action === 'reveal') {
                const res = revealCell(board, move.row, move.col);
                board = res.board;
                if (res.hitMine) return false; // Should not happen if solver is correct
            } else if (move.action === 'flag') {
                board[move.row][move.col].state = CellState.FLAGGED;
            }
        }
    }

    return checkWin(board);
}



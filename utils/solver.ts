import { CellData, CellState, SolverMove } from '../types';
import { DIRECTIONS } from './minesweeper';

// A heuristic solver that acts as our "Analyzer"
export const getNextBestMove = (board: CellData[][]): SolverMove | null => {
  const rows = board.length;
  const cols = board[0].length;
  const moves: SolverMove[] = [];

  // Helper to get neighbors
  const getNeighbors = (r: number, c: number) => {
    const neighbors: CellData[] = [];
    DIRECTIONS.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push(board[nr][nc]);
      }
    });
    return neighbors;
  };

  // 1. Certainty Pass: Look for 100% safe moves or flags
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.state === CellState.REVEALED && cell.neighborMines > 0) {
        const neighbors = getNeighbors(r, c);
        const hidden = neighbors.filter(n => n.state === CellState.HIDDEN || n.state === CellState.FLAGGED);
        const flagged = neighbors.filter(n => n.state === CellState.FLAGGED);
        const hiddenUnflagged = neighbors.filter(n => n.state === CellState.HIDDEN);

        // Rule 1: All hidden neighbors must be mines
        if (hidden.length === cell.neighborMines && hiddenUnflagged.length > 0) {
           // Return the first one found, we will just do one move at a time for visual effect
           return {
             row: hiddenUnflagged[0].row,
             col: hiddenUnflagged[0].col,
             action: 'flag',
             reasoning: `Neighbors match mine count at (${r},${c})`
           };
        }

        // Rule 2: All mines are found, rest are safe
        if (flagged.length === cell.neighborMines && hiddenUnflagged.length > 0) {
          return {
            row: hiddenUnflagged[0].row,
            col: hiddenUnflagged[0].col,
            action: 'reveal',
            reasoning: `Mines accounted for at (${r},${c})`
          };
        }
      }
    }
  }

  // 2. Probability Pass (Simplified Tank Algorithm / Heuristic)
  // If no safe moves, find the safest guess.
  // We calculate a simple probability for every border cell.
  let bestProb = 1.0;
  let bestMove: SolverMove | null = null;
  const borderCells: CellData[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].state === CellState.HIDDEN) {
        const neighbors = getNeighbors(r, c);
        // Is it a border cell? (Has a revealed neighbor)
        const revealedNeighbor = neighbors.find(n => n.state === CellState.REVEALED);
        
        if (revealedNeighbor) {
           // Calculate rough probability based on this neighbor
           // P = (Mines - Flagged) / (Hidden Neighbors)
           let maxLocalProb = 0;
           
           neighbors.forEach(n => {
             if (n.state === CellState.REVEALED) {
               const nNeighbors = getNeighbors(n.row, n.col);
               const nHidden = nNeighbors.filter(x => x.state === CellState.HIDDEN || x.state === CellState.FLAGGED);
               const nFlagged = nNeighbors.filter(x => x.state === CellState.FLAGGED);
               const unrevealedCount = nHidden.length - nFlagged.length;
               
               if (unrevealedCount > 0) {
                  const prob = (n.neighborMines - nFlagged.length) / unrevealedCount;
                  if (prob > maxLocalProb) maxLocalProb = prob;
               }
             }
           });
           
           if (maxLocalProb < bestProb) {
             bestProb = maxLocalProb;
             bestMove = {
               row: r,
               col: c,
               action: 'reveal',
               reasoning: `Calculated probability ${(maxLocalProb * 100).toFixed(1)}%`
             };
           }
           borderCells.push(board[r][c]);
        }
      }
    }
  }

  if (bestMove) {
    return bestMove;
  }

  // 3. Complete Guess (Opening move or island)
  // Pick a random hidden cell, preferably a corner or center if empty
  const allHidden: CellData[] = [];
  board.forEach(row => row.forEach(cell => {
    if (cell.state === CellState.HIDDEN) allHidden.push(cell);
  }));

  if (allHidden.length > 0) {
    // Prefer corners for opening moves
    const corners = allHidden.filter(c => 
      (c.row === 0 && c.col === 0) || 
      (c.row === 0 && c.col === cols - 1) || 
      (c.row === rows - 1 && c.col === 0) || 
      (c.row === rows - 1 && c.col === cols - 1)
    );
    
    const target = corners.length > 0 ? corners[Math.floor(Math.random() * corners.length)] : allHidden[Math.floor(Math.random() * allHidden.length)];
    
    return {
      row: target.row,
      col: target.col,
      action: 'reveal',
      reasoning: 'Random guess (no better options)'
    };
  }

  return null;
};

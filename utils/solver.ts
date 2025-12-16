import { CellData, CellState, SolverMove } from '../types';
import { DIRECTIONS } from './minesweeper';
import { ProbabilityEngine, Action, ACTION_FLAG, ACTION_CLEAR } from './probabilityEngine';

// Adapter classes for ProbabilityEngine
class TileAdapter {
    constructor(public cell: CellData, public index: number) {}
    get x() { return this.cell.col; }
    get y() { return this.cell.row; }
    isCovered() { return this.cell.state === CellState.HIDDEN || this.cell.state === CellState.FLAGGED; }
    isSolverFoundBomb() { return this.cell.state === CellState.FLAGGED; }
    isFlagged() { return this.cell.state === CellState.FLAGGED; }
    getValue() { return this.cell.neighborMines; }
    isAdjacent(other: TileAdapter) {
        return Math.abs(this.x - other.x) <= 1 && Math.abs(this.y - other.y) <= 1 && !(this.x === other.x && this.y === other.y);
    }
    isEqual(other: TileAdapter) { return this.index === other.index; }
    asText() { return `(${this.x},${this.y})`; }
    setProbability(p: number) { /* no-op */ }

    // Extra properties used by engine
    onEdge = false;
}

class BoardAdapter {
    tiles: TileAdapter[] = [];
    width: number;
    height: number;

    constructor(public board: CellData[][]) {
        this.height = board.length;
        this.width = board[0].length;
        let idx = 0;
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                this.tiles.push(new TileAdapter(board[r][c], idx++));
            }
        }
    }

    getTile(index: number) { return this.tiles[index]; }

    getAdjacent(tile: TileAdapter) {
        const neighbors: TileAdapter[] = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = tile.y + dr;
                const nc = tile.x + dc;
                if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                    neighbors.push(this.tiles[nr * this.width + nc]);
                }
            }
        }
        return neighbors;
    }
}

// A heuristic solver that acts as our "Analyzer"
export const getNextBestMove = (board: CellData[][], totalMines: number = 0): SolverMove | null => {
  const rows = board.length;
  const cols = board[0].length;

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

  // 1. Certainty Pass: Look for 100% safe moves or flags (Fast check before heavy engine)
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

  // 2. Probability Engine Pass
  if (totalMines > 0) {
      const boardAdapter = new BoardAdapter(board);
      const witnesses: TileAdapter[] = [];
      const witnessed: TileAdapter[] = [];
      const work = new Set<number>();
      let minesLeft = totalMines;
      let squaresLeft = 0;

      // Prepare data for engine
      for (let i = 0; i < boardAdapter.tiles.length; i++) {
          const tile = boardAdapter.tiles[i];

          if (tile.isSolverFoundBomb()) {
              minesLeft--;
              continue;
          } else if (tile.isCovered()) {
              squaresLeft++;
              continue;
          }

          // It's a revealed tile, check if it's a witness
          const adjTiles = boardAdapter.getAdjacent(tile);
          let needsWork = false;
          for (const adj of adjTiles) {
              if (adj.isCovered() && !adj.isSolverFoundBomb()) {
                  needsWork = true;
                  work.add(adj.index);
              }
          }

          if (needsWork) {
              witnesses.push(tile);
          }
      }

      for (const index of work) {
          const tile = boardAdapter.getTile(index);
          tile.onEdge = true;
          witnessed.push(tile);
      }

      // Run engine
      const options = { playStyle: 1, verbose: false }; // 1 = Flags
      const pe = new ProbabilityEngine(boardAdapter, witnesses, witnessed, squaresLeft, minesLeft, options);

      if (pe.validWeb) {
          pe.process();

          // Check for safe moves (probability 1)
          if (pe.bestProbability === 1 || pe.localClears.length > 0 || pe.offEdgeProbability === 1) {
              // Prefer local clears
              if (pe.localClears.length > 0) {
                  const tile = pe.localClears[0];
                  return {
                      row: tile.y,
                      col: tile.x,
                      action: 'reveal',
                      reasoning: 'Probability Engine: 100% Safe'
                  };
              }
              // Check off-edge safe
              if (pe.offEdgeProbability === 1) {
                  // Find a non-edge hidden tile
                  const safeTile = boardAdapter.tiles.find(t => t.isCovered() && !t.onEdge && !t.isSolverFoundBomb());
                  if (safeTile) {
                      return {
                          row: safeTile.y,
                          col: safeTile.x,
                          action: 'reveal',
                          reasoning: 'Probability Engine: Off-edge 100% Safe'
                      };
                  }
              }
              // Check best probability tiles (should be 1)
              const bestCandidates = pe.getBestCandidates(0.99);
              if (bestCandidates.length > 0 && bestCandidates[0].prob === 1) {
                   const action = bestCandidates[0];
                   return {
                       row: action.y,
                       col: action.x,
                       action: 'reveal',
                       reasoning: 'Probability Engine: 100% Safe'
                   };
              }
          }

          // Check for mines (probability 0)
          if (pe.minesFound.length > 0) {
              const tile = pe.minesFound[0];
              return {
                  row: tile.y,
                  col: tile.x,
                  action: 'flag',
                  reasoning: 'Probability Engine: 100% Mine'
              };
          }

          // If no safe moves, make the best guess
          const bestCandidates = pe.getBestCandidates(0);
          if (bestCandidates.length > 0) {
              const action = bestCandidates[0];
              return {
                  row: action.y,
                  col: action.x,
                  action: 'reveal',
                  reasoning: `Probability Engine: Best Guess (${(action.prob * 100).toFixed(1)}% Safe)`
              };
          }
      }
  }

  // 3. Fallback / Opening Move
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

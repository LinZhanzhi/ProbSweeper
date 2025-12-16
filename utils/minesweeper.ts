import { BoardConfig, CellData, CellState, GameStatus } from '../types';

export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

export const createBoard = (config: BoardConfig): CellData[][] => {
  const { rows, cols, mines } = config;
  let board: CellData[][] = [];

  // Init empty board
  for (let r = 0; r < rows; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        isMine: false,
        state: CellState.HIDDEN,
        neighborMines: 0
      });
    }
    board.push(row);
  }

  // Place mines
  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!board[r][c].isMine) {
      board[r][c].isMine = true;
      minesPlaced++;
    }
  }

  // Calculate neighbors
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

  return board;
};

export const ensureSafeStart = (board: CellData[][], row: number, col: number): CellData[][] => {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = [...board.map(r => [...r.map(c => ({ ...c }))])];
  
  // Identify safe zone (clicked cell + neighbors)
  const safeZone: {r: number, c: number}[] = [];
  for(let r = row - 1; r <= row + 1; r++) {
    for(let c = col - 1; c <= col + 1; c++) {
      if(r >= 0 && r < rows && c >= 0 && c < cols) {
        safeZone.push({r, c});
      }
    }
  }

  // Collect mines currently in safe zone
  const minesToRelocate: {r: number, c: number}[] = [];
  safeZone.forEach(pos => {
    if (newBoard[pos.r][pos.c].isMine) {
      newBoard[pos.r][pos.c].isMine = false;
      minesToRelocate.push(pos);
    }
  });

  if (minesToRelocate.length === 0) return newBoard;

  // Relocate mines to random empty spots outside safe zone
  let minesRelocated = 0;
  let attempts = 0;
  const maxAttempts = rows * cols * 2; // Prevent infinite loop on nearly full boards

  while (minesRelocated < minesToRelocate.length && attempts < maxAttempts) {
    attempts++;
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    const inSafeZone = safeZone.some(p => p.r === r && p.c === c);
    
    if (!inSafeZone && !newBoard[r][c].isMine) {
      newBoard[r][c].isMine = true;
      minesRelocated++;
    }
  }

  // Recalculate all neighbor counts since mines moved
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!newBoard[r][c].isMine) {
        let count = 0;
        DIRECTIONS.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) {
            count++;
          }
        });
        newBoard[r][c].neighborMines = count;
      } else {
        // Just for consistency, though mines don't display neighbor counts
        newBoard[r][c].neighborMines = 0;
      }
    }
  }

  return newBoard;
};

export const revealCell = (board: CellData[][], row: number, col: number): { board: CellData[][], hitMine: boolean, revealedCount: number } => {
  const newBoard = [...board.map(r => [...r.map(c => ({ ...c }))])];
  const cell = newBoard[row][col];

  if (cell.state !== CellState.HIDDEN && cell.state !== CellState.QUESTION) {
    return { board: newBoard, hitMine: false, revealedCount: 0 };
  }

  if (cell.isMine) {
    cell.state = CellState.REVEALED;
    return { board: newBoard, hitMine: true, revealedCount: 1 };
  }

  // BFS flood fill
  let revealedCount = 0;
  const queue = [[row, col]];
  
  // Set initial state to avoid re-queueing
  if (cell.state === CellState.HIDDEN) {
    cell.state = CellState.REVEALED;
    revealedCount++;
  }

  let head = 0;
  while(head < queue.length){
      const [cr, cc] = queue[head++];
      const current = newBoard[cr][cc];

      if (current.neighborMines === 0) {
          DIRECTIONS.forEach(([dr, dc]) => {
              const nr = cr + dr;
              const nc = cc + dc;
              if (nr >= 0 && nr < newBoard.length && nc >= 0 && nc < newBoard[0].length) {
                  const neighbor = newBoard[nr][nc];
                  if (neighbor.state === CellState.HIDDEN) {
                      neighbor.state = CellState.REVEALED;
                      revealedCount++;
                      if(neighbor.neighborMines === 0){
                          queue.push([nr, nc]);
                      }
                  }
              }
          });
      }
  }

  return { board: newBoard, hitMine: false, revealedCount };
};

export const chordCell = (board: CellData[][], row: number, col: number): { board: CellData[][], hitMine: boolean } => {
  const cell = board[row][col];
  const rows = board.length;
  const cols = board[0].length;

  // Can only chord on revealed cells with mines around them
  if (cell.state !== CellState.REVEALED || cell.neighborMines === 0) {
    return { board, hitMine: false };
  }

  // Count flags around the cell
  let flagCount = 0;
  const neighbors: {r: number, c: number}[] = [];
  
  DIRECTIONS.forEach(([dr, dc]) => {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      neighbors.push({r: nr, c: nc});
      if (board[nr][nc].state === CellState.FLAGGED) {
        flagCount++;
      }
    }
  });

  // If flags match neighbor mines, reveal valid hidden neighbors
  if (flagCount === cell.neighborMines) {
    let currentBoard = board;
    let anyMineHit = false;

    // We must reveal all hidden non-flagged neighbors
    for (const {r, c} of neighbors) {
      const neighbor = currentBoard[r][c];
      if (neighbor.state === CellState.HIDDEN) {
        const result = revealCell(currentBoard, r, c);
        currentBoard = result.board;
        if (result.hitMine) {
          anyMineHit = true;
        }
      }
    }
    return { board: currentBoard, hitMine: anyMineHit };
  }

  return { board, hitMine: false };
};

export const toggleFlag = (board: CellData[][], row: number, col: number): CellData[][] => {
  const newBoard = [...board.map(r => [...r.map(c => ({ ...c }))])];
  const cell = newBoard[row][col];

  if (cell.state === CellState.HIDDEN) {
    cell.state = CellState.FLAGGED;
  } else if (cell.state === CellState.FLAGGED) {
    cell.state = CellState.HIDDEN; // Optionally toggle to QUESTION
  }

  return newBoard;
};

export const checkWin = (board: CellData[][]): boolean => {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const cell = board[r][c];
      if (!cell.isMine && cell.state !== CellState.REVEALED) {
        return false;
      }
    }
  }
  return true;
};

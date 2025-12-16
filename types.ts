export enum CellState {
  HIDDEN,
  REVEALED,
  FLAGGED,
  QUESTION
}

export interface CellData {
  row: number;
  col: number;
  isMine: boolean;
  state: CellState;
  neighborMines: number;
  probability?: number; // For the analyzer visualization
}

export enum GameStatus {
  IDLE,
  PLAYING,
  WON,
  LOST
}

export interface BoardConfig {
  rows: number;
  cols: number;
  mines: number;
}

export interface SolverMove {
  row: number;
  col: number;
  action: 'reveal' | 'flag';
  reasoning: string;
}

import { useState, useEffect } from 'react';
import { getNextBestMove } from '../utils/solver';
import { checkWin, revealCell, toggleFlag, ensureSafeStart } from '../utils/minesweeper';
import { GameStatus, CellState, CellData, BoardConfig } from '../types';
import { PLAY_STYLE_FLAGS } from '../utils/probabilityEngine';

interface UseAutoSolverProps {
  board: CellData[][];
  setBoard: (board: CellData[][]) => void;
  status: GameStatus;
  setStatus: (status: GameStatus) => void;
  minesLeft: number;
  setMinesLeft: (mines: number) => void;
  config: BoardConfig;
  isNoGuessMode: boolean;
  isReplay: boolean;
  handleCellClick: (r: number, c: number) => void;
  handleRightClick: (e: React.MouseEvent | null, r: number, c: number) => void;
}

export const useAutoSolver = ({
  board, setBoard, status, setStatus, minesLeft, setMinesLeft, config,
  isNoGuessMode, isReplay, handleCellClick, handleRightClick
}: UseAutoSolverProps) => {
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isFastAutoMode, setIsFastAutoMode] = useState(false);
  const [isLightSpeedMode, setIsLightSpeedMode] = useState(false);
  const [isCertainMode, setIsCertainMode] = useState(false);
  const [solverMode, setSolverMode] = useState<number>(PLAY_STYLE_FLAGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState(false);

  useEffect(() => {
    let timeout: any;

    const runAutoStep = async () => {
      if (!isAutoMode || status === GameStatus.WON || status === GameStatus.LOST) {
        setIsAutoMode(false);
        return;
      }

      setIsProcessing(true);

      if (isLightSpeedMode) {
          let currentBoard = JSON.parse(JSON.stringify(board));
          let movesMade = 0;
          let gameStatus = status;
          let currentMinesLeft = minesLeft;

          const MAX_MOVES = 2500;

          while (movesMade < MAX_MOVES) {
              const move = getNextBestMove(currentBoard, config.mines, solverMode, isCertainMode);
              if (!move) break;

              if (move.action === 'reveal') {
                  if (gameStatus === GameStatus.IDLE && movesMade === 0) {
                      if (!isNoGuessMode && !isReplay) {
                          currentBoard = ensureSafeStart(currentBoard, move.row, move.col);
                      }
                      gameStatus = GameStatus.PLAYING;
                  }

                  const result = revealCell(currentBoard, move.row, move.col);
                  currentBoard = result.board;
                  if (result.hitMine) {
                      gameStatus = GameStatus.LOST;
                      currentBoard[move.row][move.col].isExploded = true;
                      break;
                  }
              } else {
                  currentBoard = toggleFlag(currentBoard, move.row, move.col);
              }

              if (checkWin(currentBoard)) {
                  gameStatus = GameStatus.WON;
                  break;
              }

              movesMade++;

              if (movesMade % 50 === 0) {
                  await new Promise(r => setTimeout(r, 0));
              }
          }

          setBoard(currentBoard);
          setStatus(gameStatus);

          const flaggedCount = currentBoard.flat().filter((c: CellData) => c.state === CellState.FLAGGED).length;
          setMinesLeft(config.mines - flaggedCount);

          if (gameStatus !== GameStatus.PLAYING) {
              setIsAutoMode(false);
          } else if (movesMade === 0) {
              setIsAutoMode(false);
              setLastHint("Analyzer: No logical moves found. Stuck!");
          }
      } else {
          await new Promise(resolve => setTimeout(resolve, isFastAutoMode ? 50 : 600));

          const move = getNextBestMove(board, config.mines, solverMode, isCertainMode);

          if (move) {
            if (move.action === 'reveal') {
               handleCellClick(move.row, move.col);
               setLastHint(`Analyzer: Revealed (${move.row}, ${move.col}) - ${move.reasoning}`);
            } else {
               handleRightClick(null, move.row, move.col);
               setLastHint(`Analyzer: Flagged (${move.row}, ${move.col}) - ${move.reasoning}`);
            }
          } else {
            setIsAutoMode(false);
            setLastHint("Analyzer: No logical moves found. Stuck!");
          }
      }
      setIsProcessing(false);
    };

    if (isAutoMode) {
      runAutoStep();
    }

    return () => clearTimeout(timeout);
  }, [isAutoMode, board, status, handleCellClick, config.mines, isFastAutoMode, isLightSpeedMode, isCertainMode, solverMode]);

  return {
    isAutoMode, setIsAutoMode,
    isFastAutoMode, setIsFastAutoMode,
    isLightSpeedMode, setIsLightSpeedMode,
    isCertainMode, setIsCertainMode,
    solverMode, setSolverMode,
    isProcessing,
    lastHint, setLastHint,
    analysisMode, setAnalysisMode
  };
};

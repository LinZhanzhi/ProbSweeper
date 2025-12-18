import { useState, useEffect, useCallback, useRef } from 'react';
import { createBoard, revealCell, toggleFlag, checkWin, ensureSafeStart, chordCell } from '../utils/minesweeper';
import { generateNoGuessBoard } from '../utils/boardGenerator';
import { BoardConfig, CellData, GameStatus, CellState } from '../types';

export const PRESETS = {
  BEGINNER: { rows: 9, cols: 9, mines: 10 },
  INTERMEDIATE: { rows: 16, cols: 16, mines: 40 },
  EXPERT: { rows: 16, cols: 30, mines: 99 }
};

export const useGameLogic = () => {
  const [config, setConfig] = useState<BoardConfig>(PRESETS.BEGINNER);
  const [board, setBoard] = useState<CellData[][]>(() => createBoard(PRESETS.BEGINNER));
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [minesLeft, setMinesLeft] = useState(PRESETS.BEGINNER.mines);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [suggestedStart, setSuggestedStart] = useState<{r: number, c: number} | null>(null);
  const [isReplay, setIsReplay] = useState(false);
  const [lastSafeBoard, setLastSafeBoard] = useState<CellData[][] | null>(null);
  const [isNoGuessMode, setIsNoGuessMode] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Timer
  useEffect(() => {
    if (status === GameStatus.PLAYING && !timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else if (status !== GameStatus.PLAYING && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const resetGame = useCallback(async (newConfig: BoardConfig = config) => {
    setIsGenerating(true);
    setStatus(GameStatus.IDLE);
    setTime(0);
    if (timerRef.current) clearInterval(timerRef.current);

    // Small delay to allow UI to update (show loading state)
    await new Promise(r => setTimeout(r, 10));

    const newBoard = createBoard(newConfig);
    setBoard(newBoard);
    setMinesLeft(newConfig.mines);
    setGameStarted(true);
    setSuggestedStart(null);
    setIsReplay(false);

    if (isNoGuessMode) {
        setGenerationStatus("Initializing...");
        const result = await generateNoGuessBoard(newConfig, 10000, (status) => {
            setGenerationStatus(status);
        });
        if (result) {
            setBoard(result.board);
            setSuggestedStart(result.start);
        } else {
            alert("Could not generate a No Guess board. Falling back to standard random board.");
        }
        setIsGenerating(false);
        setGenerationStatus("");
    } else {
        setIsGenerating(false);
    }
  }, [config, isNoGuessMode]);

  const handleCellClick = useCallback(async (r: number, c: number) => {
    if (status === GameStatus.WON || status === GameStatus.LOST || isGenerating) return;
    if (board[r][c].state === CellState.FLAGGED) return;

    if (status === GameStatus.IDLE && isNoGuessMode && suggestedStart) {
        if (r !== suggestedStart.r || c !== suggestedStart.c) {
            return;
        }
    }

    let currentBoard = board;
    let hitMine = false;
    let newBoard = board;

    if (board[r][c].state === CellState.REVEALED) {
      const result = chordCell(currentBoard, r, c);
      newBoard = result.board;
      hitMine = result.hitMine;
    } else {
      if (status === GameStatus.IDLE) {
        if (!isNoGuessMode && !isReplay) {
            currentBoard = ensureSafeStart(currentBoard, r, c);
        }
        setStatus(GameStatus.PLAYING);
      }

      const result = revealCell(currentBoard, r, c);
      newBoard = result.board;
      hitMine = result.hitMine;
    }

    setBoard(newBoard);

    if (hitMine) {
      setLastSafeBoard(board);
      const explodedBoard = newBoard.map((row, rowIndex) => row.map((cell, colIndex) => {
          if (rowIndex === r && colIndex === c) {
              return { ...cell, isExploded: true };
          }
          return cell;
      }));
      setBoard(explodedBoard);
      setStatus(GameStatus.LOST);
    } else {
      if (status === GameStatus.IDLE) setStatus(GameStatus.PLAYING);
      if (checkWin(newBoard)) {
        setStatus(GameStatus.WON);
      }
    }
  }, [board, status, isGenerating, isNoGuessMode, isReplay, suggestedStart]);

  const handleRightClick = useCallback((e: React.MouseEvent | null, r: number, c: number) => {
    if (e) e.preventDefault();
    if (status === GameStatus.WON || status === GameStatus.LOST) return;
    if (board[r][c].state === CellState.REVEALED) return;

    const newBoard = toggleFlag(board, r, c);
    setBoard(newBoard);

    const flaggedCount = newBoard.flat().filter(c => c.state === CellState.FLAGGED).length;
    setMinesLeft(config.mines - flaggedCount);
  }, [board, status, config.mines]);

  const handleReplay = () => {
      const newBoard = board.map(row => row.map(cell => ({
          ...cell,
          state: CellState.HIDDEN,
      })));

      setBoard(newBoard);
      setStatus(GameStatus.IDLE);
      setTime(0);
      setMinesLeft(config.mines);
      if (timerRef.current) clearInterval(timerRef.current);
      setGameStarted(true);
      setIsReplay(true);
  };

  const handleUndo = () => {
      if (lastSafeBoard) {
          setBoard(lastSafeBoard);
          setStatus(GameStatus.PLAYING);
          setLastSafeBoard(null);
          const flaggedCount = lastSafeBoard.flat().filter(c => c.state === CellState.FLAGGED).length;
          setMinesLeft(config.mines - flaggedCount);
      }
  };

  return {
    config, setConfig,
    board, setBoard,
    status, setStatus,
    minesLeft, setMinesLeft,
    time, setTime,
    gameStarted, setGameStarted,
    isGenerating, setIsGenerating,
    generationStatus, setGenerationStatus,
    suggestedStart, setSuggestedStart,
    isReplay, setIsReplay,
    lastSafeBoard, setLastSafeBoard,
    isNoGuessMode, setIsNoGuessMode,
    resetGame,
    handleCellClick,
    handleRightClick,
    handleReplay,
    handleUndo,
    PRESETS
  };
};

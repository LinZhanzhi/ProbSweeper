import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Board } from './Board';
import { createBoard, revealCell, toggleFlag, checkWin, ensureSafeStart, chordCell } from '../utils/minesweeper';
import { getNextBestMove, getBoardProbabilities } from '../utils/solver';
import { generateNoGuessBoard } from '../utils/boardGenerator';
import { PLAY_STYLE_FLAGS, PLAY_STYLE_NOFLAGS, PLAY_STYLE_EFFICIENCY } from '../utils/probabilityEngine';
import { BoardConfig, CellData, GameStatus, CellState } from '../types';
import { RefreshCw, Play, Brain, Settings, AlertTriangle, Sparkles, StopCircle, Microscope, Cog, ShieldCheck, Zap, RotateCcw, Smile, Frown, Glasses, Keyboard } from 'lucide-react';

const PRESETS = {
  BEGINNER: { rows: 9, cols: 9, mines: 10 },
  INTERMEDIATE: { rows: 16, cols: 16, mines: 40 },
  EXPERT: { rows: 16, cols: 30, mines: 99 }
};

export const Game: React.FC = () => {
  const [config, setConfig] = useState<BoardConfig>(PRESETS.BEGINNER);
  // Initialize with a board immediately to avoid "undefined" errors on first render
  const [board, setBoard] = useState<CellData[][]>(() => createBoard(PRESETS.BEGINNER));
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [minesLeft, setMinesLeft] = useState(PRESETS.BEGINNER.mines);
  const [time, setTime] = useState(0);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isFastAutoMode, setIsFastAutoMode] = useState(false);
  const [isCertainMode, setIsCertainMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReplay, setIsReplay] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customConfig, setCustomConfig] = useState({ rows: 50, cols: 50, mines: 400 }); // Default 50x50
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [solverMode, setSolverMode] = useState<number>(PLAY_STYLE_FLAGS);
  const [showSolverSettings, setShowSolverSettings] = useState(false);
  const [isNoGuessMode, setIsNoGuessMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [suggestedStart, setSuggestedStart] = useState<{r: number, c: number} | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{r: number, c: number} | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'replay' | 'newGame';
    focus: 'confirm' | 'cancel';
  }>({ isOpen: false, type: 'newGame', focus: 'confirm' });
  const [lastSafeBoard, setLastSafeBoard] = useState<CellData[][] | null>(null);
  const [gameOverFocus, setGameOverFocus] = useState<'undo' | 'replay' | 'newGame'>('undo');

  // New State for Game Setup
  const [gameStarted, setGameStarted] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'CUSTOM'>('BEGINNER');

  const timerRef = useRef<number | null>(null);

  // Memoized board with probabilities
  const displayBoard = useMemo(() => {
    if (!analysisMode || status === GameStatus.WON || status === GameStatus.LOST) {
      return board;
    }

    const probs = getBoardProbabilities(board, config.mines);
    return board.map((row, r) => row.map((cell, c) => {
      const p = probs.find(x => x.row === r && x.col === c);
      return {
        ...cell,
        probability: p ? p.probability : undefined,
        isSuggestedStart: suggestedStart && suggestedStart.r === r && suggestedStart.c === c
      };
    }));
  }, [board, analysisMode, config.mines, status, suggestedStart]);

  // Pass suggestedStart to displayBoard even if analysisMode is off
  const finalDisplayBoard = useMemo(() => {
      return displayBoard.map((row, r) => row.map((cell, c) => ({
          ...cell,
          isSuggestedStart: suggestedStart && suggestedStart.r === r && suggestedStart.c === c
      })));
  }, [displayBoard, suggestedStart]);

  // Reset focus when game is lost
  useEffect(() => {
      if (status === GameStatus.LOST) {
          setGameOverFocus('undo');
      }
  }, [status]);

  // Initialize game
  const resetGame = useCallback(async (newConfig: BoardConfig = config) => {
    setIsGenerating(true);
    setStatus(GameStatus.IDLE);
    setTime(0);
    setIsAutoMode(false);
    setLastHint(null);
    if (timerRef.current) clearInterval(timerRef.current);

    // Small delay to allow UI to update (show loading state)
    await new Promise(r => setTimeout(r, 10));

    // Always create a standard board first (visual placeholder or actual start)
    const newBoard = createBoard(newConfig);
    setBoard(newBoard);
    setMinesLeft(newConfig.mines);
    setGameStarted(true);
    setSuggestedStart(null);
    setIsReplay(false);

    if (isNoGuessMode) {
        setIsGenerating(true);
        setGenerationStatus("Initializing...");
        // Generate No Guess board immediately
        const result = await generateNoGuessBoard(newConfig, 10000, (status) => {
            setGenerationStatus(status);
        });
        if (result) {
            setBoard(result.board);
            setSuggestedStart(result.start);
        } else {
            alert("Could not generate a No Guess board. Falling back to standard random board.");
            // Keep the random board generated above
        }
        setIsGenerating(false);
        setGenerationStatus("");
    } else {
        setIsGenerating(false);
    }
  }, [config, isNoGuessMode]);

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

  // Click Handlers
  const handleCellClick = useCallback(async (r: number, c: number) => {
    if (status === GameStatus.WON || status === GameStatus.LOST || isProcessing || isGenerating) return;
    if (board[r][c].state === CellState.FLAGGED) return;

    // Enforce suggested start in No Guess mode
    if (status === GameStatus.IDLE && isNoGuessMode && suggestedStart) {
        if (r !== suggestedStart.r || c !== suggestedStart.c) {
            return; // Ignore clicks elsewhere
        }
    }

    let currentBoard = board;
    let hitMine = false;
    let newBoard = board;

    if (board[r][c].state === CellState.REVEALED) {
      // Try to chord if clicked on a revealed number
      const result = chordCell(currentBoard, r, c);
      newBoard = result.board;
      hitMine = result.hitMine;
    } else {
      // Normal reveal
      if (status === GameStatus.IDLE) {
        // Standard start logic (No Guess is pre-generated now)
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
      setLastSafeBoard(board); // Save state before the fatal move
      // Mark the exploded mine
      const explodedBoard = newBoard.map((row, rowIndex) => row.map((cell, colIndex) => {
          if (rowIndex === r && colIndex === c) {
              return { ...cell, isExploded: true };
          }
          return cell;
      }));
      setBoard(explodedBoard);
      setStatus(GameStatus.LOST);
      setIsAutoMode(false);
    } else {
      if (status === GameStatus.IDLE) setStatus(GameStatus.PLAYING);
      if (checkWin(newBoard)) {
        setStatus(GameStatus.WON);
        setIsAutoMode(false);
      }
    }
  }, [board, status, isProcessing, isNoGuessMode, isReplay, suggestedStart]);

  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status === GameStatus.WON || status === GameStatus.LOST || isProcessing) return;

    // Only allow flagging hidden cells
    if (board[r][c].state === CellState.REVEALED) return;

    const newBoard = toggleFlag(board, r, c);
    setBoard(newBoard);

    // Update mines left counter
    const flaggedCount = newBoard.flat().filter(c => c.state === CellState.FLAGGED).length;
    setMinesLeft(config.mines - flaggedCount);
  }, [board, status, config.mines, isProcessing]);

  const handleCellMouseEnter = useCallback((r: number, c: number) => {
    setHoveredCell({ r, c });
  }, []);

  const handleCellMouseLeave = useCallback((r: number, c: number) => {
    setHoveredCell(prev => (prev && prev.r === r && prev.c === c ? null : prev));
  }, []);

  // Auto Solver Logic
  useEffect(() => {
    let timeout: any;

    const runAutoStep = async () => {
      // Fix: Check for game over states directly to avoid TS error about lack of overlap
      if (!isAutoMode || status === GameStatus.WON || status === GameStatus.LOST) {
        setIsAutoMode(false);
        return;
      }

      setIsProcessing(true);

      // Delay for visual "keep up"
      await new Promise(resolve => setTimeout(resolve, isFastAutoMode ? 50 : 600));

      const move = getNextBestMove(board, config.mines, solverMode, isCertainMode);

      if (move) {
        if (move.action === 'reveal') {
           handleCellClick(move.row, move.col);
           setLastHint(`Analyzer: Revealed (${move.row}, ${move.col}) - ${move.reasoning}`);
        } else {
           // We manually handle flag action here since handleRightClick needs an event
           const newBoard = toggleFlag(board, move.row, move.col);
           setBoard(newBoard);
           setLastHint(`Analyzer: Flagged (${move.row}, ${move.col}) - ${move.reasoning}`);
           // Recalculate mines count
            const flaggedCount = newBoard.flat().filter(c => c.state === CellState.FLAGGED).length;
            setMinesLeft(config.mines - flaggedCount);
        }
      } else {
        setIsAutoMode(false);
        setLastHint("Analyzer: No logical moves found. Stuck!");
      }
      setIsProcessing(false);
    };

    if (isAutoMode) {
      runAutoStep();
    }

    return () => clearTimeout(timeout);
  }, [isAutoMode, board, status, handleCellClick, config.mines, isFastAutoMode, isCertainMode, solverMode]);

  // Gemini Hint removed


  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This function is now deprecated/unused as logic moved to handleGenerateGame
  };

  const handleGenerateGame = () => {
      let newConfig = PRESETS.BEGINNER;
      if (selectedPreset === 'INTERMEDIATE') newConfig = PRESETS.INTERMEDIATE;
      if (selectedPreset === 'EXPERT') newConfig = PRESETS.EXPERT;
      if (selectedPreset === 'CUSTOM') {
          newConfig = {
            rows: Math.min(100, Math.max(5, customConfig.rows)),
            cols: Math.min(100, Math.max(5, customConfig.cols)),
            mines: Math.min(Math.floor(customConfig.rows * customConfig.cols * 0.8), Math.max(1, customConfig.mines))
          };
      }
      setConfig(newConfig);
      resetGame(newConfig);
      setShowGameSettings(false);
  };

  const handleReplay = () => {
      // Reset board state but keep mines
      const newBoard = board.map(row => row.map(cell => ({
          ...cell,
          state: CellState.HIDDEN,
          // Keep isMine and neighborMines
      })));

      setBoard(newBoard);
      setStatus(GameStatus.IDLE);
      setTime(0);
      setMinesLeft(config.mines);
      setIsAutoMode(false);
      setLastHint(null);
      if (timerRef.current) clearInterval(timerRef.current);
      setGameStarted(true);
      setIsReplay(true);
      // setSuggestedStart(null);
  };

  const handleUndo = () => {
      if (lastSafeBoard) {
          setBoard(lastSafeBoard);
          setStatus(GameStatus.PLAYING);
          setLastSafeBoard(null);
          // Recalculate mines left based on restored board
          const flaggedCount = lastSafeBoard.flat().filter(c => c.state === CellState.FLAGGED).length;
          setMinesLeft(config.mines - flaggedCount);
      }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // If modal is open, handle modal navigation
      if (confirmationModal.isOpen) {
        e.preventDefault(); // Prevent default scrolling/actions
        if (e.key === 'Tab') {
          setConfirmationModal(prev => ({
            ...prev,
            focus: prev.focus === 'confirm' ? 'cancel' : 'confirm'
          }));
        } else if (e.key === ' ') {
          if (confirmationModal.focus === 'confirm') {
            if (confirmationModal.type === 'replay') handleReplay();
            else handleGenerateGame();
          }
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } else if (e.key === 'Escape') {
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }
        return;
      }

      // Game Over Modal Navigation
      if (status === GameStatus.LOST) {
          if (e.key === 'Tab') {
              e.preventDefault();
              setGameOverFocus(prev => {
                  if (prev === 'undo') return 'replay';
                  if (prev === 'replay') return 'newGame';
                  return 'undo';
              });
          } else if (e.key === ' ') {
              e.preventDefault();
              if (gameOverFocus === 'undo') handleUndo();
              if (gameOverFocus === 'replay') handleReplay();
              if (gameOverFocus === 'newGame') resetGame();
          }
          return;
      }

      // Game shortcuts
      if (e.key.toLowerCase() === 'f') {
        if (hoveredCell) {
            const mockEvent = { preventDefault: () => {} } as React.MouseEvent;
            handleRightClick(mockEvent, hoveredCell.r, hoveredCell.c);
        }
      } else if (e.key.toLowerCase() === 'e') {
        if (hoveredCell) {
            handleCellClick(hoveredCell.r, hoveredCell.c);
        }
      } else if (e.key.toLowerCase() === 'r') {
        setConfirmationModal({ isOpen: true, type: 'replay', focus: 'confirm' });
      } else if (e.key.toLowerCase() === 't') {
        setConfirmationModal({ isOpen: true, type: 'newGame', focus: 'confirm' });
      } else if (e.key.toLowerCase() === 'h') {
        setAnalysisMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCell, confirmationModal, handleRightClick, handleCellClick, handleReplay, handleGenerateGame, status, gameOverFocus, lastSafeBoard, resetGame]); // Dependencies might cause re-binds, but acceptable here
  return (
    <div className="h-screen w-full bg-slate-900 text-gray-100 font-sans flex flex-col overflow-hidden">
      {/* Fixed Header Section */}
      <div className="flex-none w-full flex flex-col items-center gap-4 p-4 bg-slate-900 z-10 shadow-xl border-b border-slate-800">
        <div className="max-w-4xl w-full flex flex-col gap-4">

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 relative">
          <div className="flex items-stretch">
            <button id="new-game-button" name="new-game-button" onClick={handleGenerateGame} disabled={isGenerating} className="btn-primary flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-l-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-wait">
                <RefreshCw size={18} className={isGenerating ? "animate-spin" : ""} /> {isGenerating ? "Generating..." : "New Game"}
            </button>
            <button
                id="game-settings-button"
                name="game-settings-button"
                onClick={() => setShowGameSettings(!showGameSettings)}
                className={`px-3 py-2 rounded-r-lg transition-colors flex items-center gap-1 shadow-lg ${showGameSettings ? 'bg-slate-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-slate-100 border-l border-blue-700'}`}
            >
                <Settings size={20} />
            </button>
          </div>

          <button id="replay-button" name="replay-button" onClick={handleReplay} disabled={isGenerating || !gameStarted} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-all shadow-lg hover:shadow-slate-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" title="Replay same board">
            <RotateCcw size={18} /> Replay
          </button>

          {/* Keyboard Shortcuts Info */}
          <div className="relative group">
            <button id="keyboard-shortcuts-button" name="keyboard-shortcuts-button" className="px-3 py-2 rounded transition-colors flex items-center gap-1 hover:bg-slate-700 text-slate-300">
              <Keyboard size={20} />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-slate-800 p-4 rounded-xl border border-slate-600 shadow-2xl z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-2 pointer-events-none">
                <h3 className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-1">Keyboard Shortcuts</h3>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-slate-400">
                    <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">F</span> <span>Flag/Unflag Cell</span>
                    <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">E</span> <span>Open Cell</span>
                    <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">R</span> <span>Replay Game</span>
                    <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">T</span> <span>New Game</span>
                    <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">H</span> <span>Toggle Analysis</span>
                    <div className="col-span-2 h-px bg-slate-700 my-1"></div>
                    <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">Tab</span> <span>Switch Focus</span>
                    <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">Space</span> <span>Confirm Action</span>
                </div>
            </div>
          </div>

          {/* Status & Stats */}
          <div className="flex items-center gap-4 ml-2 pl-2 border-l border-slate-600">
             <div className="flex items-center gap-2">
                 {/* Face Icon Status */}
                 <div
                    id="game-status-indicator"
                    className="w-10 h-10 bg-yellow-400 rounded-full border-4 border-yellow-600 flex items-center justify-center shadow-lg"
                 >
                    {status === GameStatus.WON ? (
                        <Glasses className="text-black w-6 h-6" />
                    ) : status === GameStatus.LOST ? (
                        <Frown className="text-black w-6 h-6" />
                    ) : (
                        <Smile className="text-black w-6 h-6" />
                    )}
                 </div>

                 {/* Undo Button (Only visible when lost) */}
                 {status === GameStatus.LOST && lastSafeBoard && (
                     <button
                        id="undo-button"
                        name="undo-button"
                        onClick={handleUndo}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-500 text-yellow-400 transition-colors"
                        title="Undo Last Move"
                     >
                        <RotateCcw size={20} className="rotate-180" />
                     </button>
                 )}
             </div>

             <div className="flex gap-2 font-mono text-lg">
                <div className="bg-black/40 px-3 py-1.5 rounded border border-slate-600 text-red-400 min-w-[80px] text-center">
                   {String(minesLeft).padStart(3, '0')}
                </div>
                <div className="bg-black/40 px-3 py-1.5 rounded border border-slate-600 text-green-400 min-w-[80px] text-center">
                   {String(time).padStart(3, '0')}
                </div>
             </div>
          </div>

          {/* Game Settings Modal/Popover */}
          {showGameSettings && (
            <div className="absolute top-full mt-2 bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl z-50 w-80 animate-in slide-in-from-top-2">
                <h3 className="font-bold text-lg mb-4 text-slate-200 border-b border-slate-700 pb-2">Game Settings</h3>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Difficulty</label>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input id="difficulty-beginner" type="radio" name="difficulty" checked={selectedPreset === 'BEGINNER'} onChange={() => setSelectedPreset('BEGINNER')} className="accent-blue-500" />
                            <span>Easy (9W x 9H, 10 mines)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input id="difficulty-intermediate" type="radio" name="difficulty" checked={selectedPreset === 'INTERMEDIATE'} onChange={() => setSelectedPreset('INTERMEDIATE')} className="accent-blue-500" />
                            <span>Medium (16W x 16H, 40 mines)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input id="difficulty-expert" type="radio" name="difficulty" checked={selectedPreset === 'EXPERT'} onChange={() => setSelectedPreset('EXPERT')} className="accent-blue-500" />
                            <span>Hard (30W x 16H, 99 mines)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input id="difficulty-custom" type="radio" name="difficulty" checked={selectedPreset === 'CUSTOM'} onChange={() => setSelectedPreset('CUSTOM')} className="accent-blue-500" />
                            <span>Custom</span>
                        </label>
                    </div>
                </div>

                {selectedPreset === 'CUSTOM' && (
                    <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <label className="text-[10px] text-slate-400 block">Width</label>
                                <input id="custom-width" type="number" value={customConfig.cols} onChange={e => setCustomConfig({...customConfig, cols: parseInt(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 w-full text-center text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block">Height</label>
                                <input id="custom-height" type="number" value={customConfig.rows} onChange={e => setCustomConfig({...customConfig, rows: parseInt(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 w-full text-center text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block">Mines</label>
                                <input id="custom-mines" type="number" value={customConfig.mines} onChange={e => setCustomConfig({...customConfig, mines: parseInt(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 w-full text-center text-sm" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Game Mode</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input id="mode-classic" type="radio" name="mode" checked={!isNoGuessMode} onChange={() => setIsNoGuessMode(false)} className="accent-blue-500" />
                            <span>Classic</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input id="mode-noguess" type="radio" name="mode" checked={isNoGuessMode} onChange={() => setIsNoGuessMode(true)} className="accent-green-500" />
                            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-green-400"/> No Guess</span>
                        </label>
                    </div>
                </div>

                <button id="modal-generate-button" name="modal-generate-button" onClick={handleGenerateGame} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold shadow-lg">
                    Generate Board
                </button>
            </div>
          )}
        </div>

        {/* Custom Config Panel Removed (Moved to Modal) */}

        {/* AI & Auto Tools */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap gap-3 justify-center items-center">
             <div className="flex items-stretch">
               <button
                 id="auto-finish-button"
                 name="auto-finish-button"
                 onClick={() => setIsAutoMode(!isAutoMode)}
                 disabled={status === GameStatus.WON || status === GameStatus.LOST}
                 className={`flex items-center gap-2 px-6 py-3 rounded-l-lg font-bold transition-all shadow-xl ${isAutoMode
                   ? 'bg-red-500 hover:bg-red-400 animate-pulse'
                   : 'bg-purple-600 hover:bg-purple-500 hover:shadow-purple-500/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
               >
                 {isAutoMode ? <StopCircle /> : <Play />}
                 {isAutoMode ? 'Stop Auto' : 'Auto Finish'}
               </button>
               <button
                  id="solver-settings-button"
                  name="solver-settings-button"
                  onClick={() => setShowSolverSettings(!showSolverSettings)}
                  className="bg-purple-600 hover:bg-purple-500 px-3 py-3 rounded-r-lg shadow-xl border-l border-purple-700 transition-colors"
                  title="Solver Settings"
               >
                  <Cog size={24} />
               </button>
             </div>

             <button
               id="analysis-mode-button"
               name="analysis-mode-button"
               onClick={() => setAnalysisMode(!analysisMode)}
               disabled={status === GameStatus.WON || status === GameStatus.LOST}
               className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shadow-xl ${analysisMode
                 ? 'bg-teal-500 hover:bg-teal-400 ring-2 ring-teal-300'
                 : 'bg-teal-700 hover:bg-teal-600 hover:shadow-teal-500/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
             >
               <Microscope size={18} />
               {analysisMode ? 'Analysis On' : 'Analysis Mode'}
             </button>
          </div>

          {/* Solver Settings Panel */}
          {showSolverSettings && (
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-600 animate-in slide-in-from-top-2 flex gap-4 items-center">
               <span className="text-slate-300 font-semibold">Solver Style:</span>
               <div className="flex gap-2">
                  <button
                    id="solver-style-flags"
                    name="solver-style-flags"
                    onClick={() => setSolverMode(PLAY_STYLE_FLAGS)}
                    className={`px-3 py-1 rounded text-sm ${solverMode === PLAY_STYLE_FLAGS ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    Flags
                  </button>
                  <button
                    id="solver-style-noflags"
                    name="solver-style-noflags"
                    onClick={() => setSolverMode(PLAY_STYLE_NOFLAGS)}
                    className={`px-3 py-1 rounded text-sm ${solverMode === PLAY_STYLE_NOFLAGS ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    No Flags
                  </button>
                  <button
                    id="solver-style-efficiency"
                    name="solver-style-efficiency"
                    onClick={() => setSolverMode(PLAY_STYLE_EFFICIENCY)}
                    className={`px-3 py-1 rounded text-sm ${solverMode === PLAY_STYLE_EFFICIENCY ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    Efficiency
                  </button>
               </div>

               <div className="w-px h-6 bg-slate-600 mx-2"></div>

               <button
                 id="solver-fast-mode"
                 name="solver-fast-mode"
                 onClick={() => setIsFastAutoMode(!isFastAutoMode)}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${isFastAutoMode ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                 title="Reduce delay between auto-moves to 0.05s"
               >
                 <Zap size={14} className={isFastAutoMode ? "fill-white" : ""} /> Fast Mode
               </button>

               <button
                 id="solver-certain-only"
                 name="solver-certain-only"
                 onClick={() => setIsCertainMode(!isCertainMode)}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${isCertainMode ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                 title="Only make 100% safe moves or flag 100% mines"
               >
                 <ShieldCheck size={14} className={isCertainMode ? "fill-white" : ""} /> Certain Only
               </button>
            </div>
          )}
        </div>

        {/* Hint Display */}
        {lastHint && (
          <div className="bg-slate-800/80 border border-slate-600 text-blue-200 px-4 py-3 rounded-lg text-center font-mono text-sm flex items-center justify-center gap-2 animate-in fade-in">
             <Brain size={16} className="text-purple-400" />
             {lastHint}
          </div>
        )}
        </div>
      </div>

      {/* Scrollable Board Section */}
      <div className="flex-1 w-full flex items-center justify-center bg-slate-900 p-4 min-h-0 overflow-hidden">
        <div className="w-[85%] h-[85%] overflow-auto bg-slate-950 relative flex p-8 border-4 border-slate-800 rounded-xl shadow-2xl">
          <div className="min-w-min min-h-min m-auto">
             {isGenerating && (
                 <div className="absolute inset-0 bg-slate-900/80 z-50 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
                     <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="text-blue-400 font-bold text-lg animate-pulse">Generating No Guess Board...</p>
                     <p className="text-slate-400 text-sm mt-2">{generationStatus}</p>
                 </div>
             )}
             {gameStarted ? (
                 <Board
                   board={finalDisplayBoard}
                   onCellClick={handleCellClick}
                   onCellRightClick={handleRightClick}
                   onCellMouseEnter={handleCellMouseEnter}
                   onCellMouseLeave={handleCellMouseLeave}
                   gameStatus={status}
                 />
             ) : (
                 <div className="text-slate-500 flex flex-col items-center gap-4">
                     <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin opacity-20"></div>
                     <p>Click "Generate Game" to start</p>
                 </div>
             )}
          </div>
        </div>
      </div>

        {/* Confirmation Modal */}
        {confirmationModal.isOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-600 max-w-sm w-full text-center">
                 <h2 className="text-2xl font-bold mb-4 text-white">
                   {confirmationModal.type === 'replay' ? 'Replay Game?' : 'Start New Game?'}
                 </h2>
                 <p className="text-slate-400 mb-6">
                   {confirmationModal.type === 'replay'
                     ? 'Are you sure you want to restart this board? Current progress will be lost.'
                     : 'Are you sure you want to generate a new board? Current progress will be lost.'}
                 </p>
                 <div className="flex gap-4 justify-center">
                     <button
                       id="confirmation-modal-confirm"
                       name="confirmation-modal-confirm"
                       onClick={() => {
                         if (confirmationModal.type === 'replay') handleReplay();
                         else handleGenerateGame();
                         setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                       }}
                       className={`px-6 py-2 rounded-lg font-bold transition-all ${confirmationModal.focus === 'confirm' ? 'bg-blue-600 ring-2 ring-blue-400 scale-105' : 'bg-slate-700 text-slate-300'}`}
                     >
                       Confirm
                     </button>
                     <button
                       id="confirmation-modal-cancel"
                       name="confirmation-modal-cancel"
                       onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                       className={`px-6 py-2 rounded-lg font-bold transition-all ${confirmationModal.focus === 'cancel' ? 'bg-slate-600 ring-2 ring-slate-400 scale-105' : 'bg-slate-700 text-slate-300'}`}
                     >
                       Cancel
                     </button>
                 </div>
                 <p className="text-xs text-slate-500 mt-4">
                   Use <span className="font-mono bg-slate-700 px-1 rounded">Tab</span> to select, <span className="font-mono bg-slate-700 px-1 rounded">Space</span> to confirm
                 </p>
              </div>
           </div>
        )}

    </div>
  );
};
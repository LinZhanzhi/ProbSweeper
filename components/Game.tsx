import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Board } from './Board';
import { createBoard, revealCell, toggleFlag, checkWin, ensureSafeStart, chordCell } from '../utils/minesweeper';
import { getNextBestMove, getBoardProbabilities } from '../utils/solver';
import { generateNoGuessBoard } from '../utils/boardGenerator';
import { PLAY_STYLE_FLAGS, PLAY_STYLE_NOFLAGS, PLAY_STYLE_EFFICIENCY } from '../utils/probabilityEngine';
import { BoardConfig, CellData, GameStatus, CellState } from '../types';
import { RefreshCw, Play, Brain, Settings, AlertTriangle, Sparkles, StopCircle, Microscope, Cog, ShieldCheck, Zap, RotateCcw } from 'lucide-react';

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
            rows: Math.min(50, Math.max(5, customConfig.rows)),
            cols: Math.min(50, Math.max(5, customConfig.cols)),
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

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-gray-100 font-sans py-8 px-4 w-full">
      <div className="max-w-4xl w-full flex flex-col gap-6">

        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
          <div className="flex items-center gap-3">
             <div className="bg-red-600 p-2 rounded-lg">
               <AlertTriangle className="text-white" />
             </div>
             <div>
               <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Gemini Sweeper</h1>
               <p className="text-xs text-slate-400">Powered by Probability Analysis</p>
             </div>
          </div>

          <div className="flex gap-6 font-mono text-xl">
            <div className="bg-black/40 px-4 py-2 rounded border border-slate-600 text-red-400 min-w-[100px] text-center">
               {String(minesLeft).padStart(3, '0')}
            </div>
            <div className="bg-black/40 px-4 py-2 rounded border border-slate-600 text-green-400 min-w-[100px] text-center">
               {String(time).padStart(3, '0')}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 relative">
          <button onClick={handleGenerateGame} disabled={isGenerating} className="btn-primary flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-wait">
            <RefreshCw size={18} className={isGenerating ? "animate-spin" : ""} /> {isGenerating ? "Generating..." : "Generate Game"}
          </button>

          <button onClick={handleReplay} disabled={isGenerating || !gameStarted} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-all shadow-lg hover:shadow-slate-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" title="Replay same board">
            <RotateCcw size={18} />
          </button>

          <button
            onClick={() => setShowGameSettings(!showGameSettings)}
            className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ${showGameSettings ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
          >
            <Settings size={20} />
          </button>

          {/* Game Settings Modal/Popover */}
          {showGameSettings && (
            <div className="absolute top-full mt-2 bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl z-50 w-80 animate-in slide-in-from-top-2">
                <h3 className="font-bold text-lg mb-4 text-slate-200 border-b border-slate-700 pb-2">Game Settings</h3>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Difficulty</label>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="radio" name="difficulty" checked={selectedPreset === 'BEGINNER'} onChange={() => setSelectedPreset('BEGINNER')} className="accent-blue-500" />
                            <span>Easy (9x9, 10 mines)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="radio" name="difficulty" checked={selectedPreset === 'INTERMEDIATE'} onChange={() => setSelectedPreset('INTERMEDIATE')} className="accent-blue-500" />
                            <span>Medium (16x16, 40 mines)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="radio" name="difficulty" checked={selectedPreset === 'EXPERT'} onChange={() => setSelectedPreset('EXPERT')} className="accent-blue-500" />
                            <span>Hard (16x30, 99 mines)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="radio" name="difficulty" checked={selectedPreset === 'CUSTOM'} onChange={() => setSelectedPreset('CUSTOM')} className="accent-blue-500" />
                            <span>Custom</span>
                        </label>
                    </div>
                </div>

                {selectedPreset === 'CUSTOM' && (
                    <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <label className="text-[10px] text-slate-400 block">Width</label>
                                <input type="number" value={customConfig.cols} onChange={e => setCustomConfig({...customConfig, cols: parseInt(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 w-full text-center text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block">Height</label>
                                <input type="number" value={customConfig.rows} onChange={e => setCustomConfig({...customConfig, rows: parseInt(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 w-full text-center text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block">Mines</label>
                                <input type="number" value={customConfig.mines} onChange={e => setCustomConfig({...customConfig, mines: parseInt(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 w-full text-center text-sm" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Game Mode</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="radio" name="mode" checked={!isNoGuessMode} onChange={() => setIsNoGuessMode(false)} className="accent-blue-500" />
                            <span>Classic</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                            <input type="radio" name="mode" checked={isNoGuessMode} onChange={() => setIsNoGuessMode(true)} className="accent-green-500" />
                            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-green-400"/> No Guess</span>
                        </label>
                    </div>
                </div>

                <button onClick={handleGenerateGame} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold shadow-lg">
                    Generate Board
                </button>
            </div>
          )}
        </div>

        {/* Custom Config Panel Removed (Moved to Modal) */}

        {/* AI & Auto Tools */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap gap-3 justify-center items-center">
             <div className="flex items-center gap-1">
               <button
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
                  onClick={() => setShowSolverSettings(!showSolverSettings)}
                  className="bg-purple-700 hover:bg-purple-600 px-3 py-3 rounded-r-lg shadow-xl border-l border-purple-800 transition-colors"
                  title="Solver Settings"
               >
                  <Cog size={24} />
               </button>
             </div>

             <button
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
                    onClick={() => setSolverMode(PLAY_STYLE_FLAGS)}
                    className={`px-3 py-1 rounded text-sm ${solverMode === PLAY_STYLE_FLAGS ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    Flags
                  </button>
                  <button
                    onClick={() => setSolverMode(PLAY_STYLE_NOFLAGS)}
                    className={`px-3 py-1 rounded text-sm ${solverMode === PLAY_STYLE_NOFLAGS ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    No Flags
                  </button>
                  <button
                    onClick={() => setSolverMode(PLAY_STYLE_EFFICIENCY)}
                    className={`px-3 py-1 rounded text-sm ${solverMode === PLAY_STYLE_EFFICIENCY ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    Efficiency
                  </button>
               </div>

               <div className="w-px h-6 bg-slate-600 mx-2"></div>

               <button
                 onClick={() => setIsFastAutoMode(!isFastAutoMode)}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${isFastAutoMode ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                 title="Reduce delay between auto-moves to 0.05s"
               >
                 <Zap size={14} className={isFastAutoMode ? "fill-white" : ""} /> Fast Mode
               </button>

               <button
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

        {/* The Board */}
        <div className="w-full overflow-x-auto pb-8 text-center min-h-[300px] flex items-center justify-center relative">
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
                 gameStatus={status}
               />
           ) : (
               <div className="text-slate-500 flex flex-col items-center gap-4">
                   <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin opacity-20"></div>
                   <p>Click "Generate Game" to start</p>
               </div>
           )}
        </div>

        {/* Game Over Modal */}
        {(status === GameStatus.WON || status === GameStatus.LOST) && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-600 max-w-sm w-full text-center">
                 <div className={`text-6xl mb-4 ${status === GameStatus.WON ? 'animate-bounce' : ''}`}>
                    {status === GameStatus.WON ? '🎉' : '💥'}
                 </div>
                 <h2 className={`text-3xl font-black mb-2 ${status === GameStatus.WON ? 'text-green-400' : 'text-red-500'}`}>
                   {status === GameStatus.WON ? 'VICTORY!' : 'GAME OVER'}
                 </h2>
                 <p className="text-slate-400 mb-6">
                   {status === GameStatus.WON
                     ? `You cleared the field in ${time} seconds!`
                     : 'Better luck next time, commander.'}
                 </p>
                 <div className="flex flex-col gap-3">
                     <button
                       onClick={() => resetGame()}
                       className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                     >
                       <RefreshCw size={20} /> Play New Board
                     </button>
                     <button
                       onClick={() => handleReplay()}
                       className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-lg shadow-lg hover:shadow-slate-500/25 transition-all flex items-center justify-center gap-2"
                     >
                       <RotateCcw size={20} /> Replay This Board
                     </button>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};
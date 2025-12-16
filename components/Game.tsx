import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Board } from './Board';
import { createBoard, revealCell, toggleFlag, checkWin, ensureSafeStart, chordCell } from '../utils/minesweeper';
import { getNextBestMove, getBoardProbabilities } from '../utils/solver';
import { PLAY_STYLE_FLAGS, PLAY_STYLE_NOFLAGS, PLAY_STYLE_EFFICIENCY } from '../utils/probabilityEngine';
import { BoardConfig, CellData, GameStatus, CellState } from '../types';
import { RefreshCw, Play, Brain, Settings, AlertTriangle, Sparkles, StopCircle, Microscope, Cog } from 'lucide-react';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customConfig, setCustomConfig] = useState({ rows: 20, cols: 20, mines: 50 });
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [solverMode, setSolverMode] = useState<number>(PLAY_STYLE_FLAGS);
  const [showSolverSettings, setShowSolverSettings] = useState(false);

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
        probability: p ? p.probability : undefined
      };
    }));
  }, [board, analysisMode, config.mines, status]);

  // Initialize game
  const resetGame = useCallback((newConfig: BoardConfig = config) => {
    const newBoard = createBoard(newConfig);
    setBoard(newBoard);
    setStatus(GameStatus.IDLE);
    setMinesLeft(newConfig.mines);
    setTime(0);
    setIsAutoMode(false);
    setLastHint(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [config]);

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
  const handleCellClick = useCallback((r: number, c: number) => {
    if (status === GameStatus.WON || status === GameStatus.LOST || isProcessing) return;
    if (board[r][c].state === CellState.FLAGGED) return;

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
        currentBoard = ensureSafeStart(currentBoard, r, c);
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
  }, [board, status, isProcessing]);

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
      await new Promise(resolve => setTimeout(resolve, 600));

      const move = getNextBestMove(board, config.mines, solverMode);

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
  }, [isAutoMode, board, status, handleCellClick, config.mines]);

  // Gemini Hint removed


  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig = {
      rows: Math.min(50, Math.max(5, customConfig.rows)),
      cols: Math.min(50, Math.max(5, customConfig.cols)),
      mines: Math.min(Math.floor(customConfig.rows * customConfig.cols * 0.8), Math.max(1, customConfig.mines))
    };
    setConfig(newConfig);
    resetGame(newConfig);
    setShowCustom(false);
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
        <div className="flex flex-wrap gap-2 justify-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <button onClick={() => resetGame()} className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95">
            <RefreshCw size={18} /> New Game
          </button>

          <div className="h-8 w-[1px] bg-slate-600 mx-2 self-center hidden md:block"></div>

          <button onClick={() => { setConfig(PRESETS.BEGINNER); resetGame(PRESETS.BEGINNER); }} className={`px-3 py-1 rounded transition-colors ${config.rows === 9 ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>Easy</button>
          <button onClick={() => { setConfig(PRESETS.INTERMEDIATE); resetGame(PRESETS.INTERMEDIATE); }} className={`px-3 py-1 rounded transition-colors ${config.rows === 16 && config.cols === 16 ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>Medium</button>
          <button onClick={() => { setConfig(PRESETS.EXPERT); resetGame(PRESETS.EXPERT); }} className={`px-3 py-1 rounded transition-colors ${config.rows === 16 && config.cols === 30 ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>Hard</button>
          <button onClick={() => setShowCustom(!showCustom)} className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${showCustom ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>
            <Settings size={14} /> Custom
          </button>
        </div>

        {/* Custom Config Panel */}
        {showCustom && (
          <form onSubmit={handleCustomSubmit} className="flex flex-wrap gap-4 justify-center items-end bg-slate-800 p-4 rounded-xl border border-slate-600 animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Width</label>
              <input type="number" value={customConfig.cols} onChange={e => setCustomConfig({...customConfig, cols: parseInt(e.target.value)})} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-20 text-center" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Height</label>
              <input type="number" value={customConfig.rows} onChange={e => setCustomConfig({...customConfig, rows: parseInt(e.target.value)})} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-20 text-center" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mines</label>
              <input type="number" value={customConfig.mines} onChange={e => setCustomConfig({...customConfig, mines: parseInt(e.target.value)})} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-20 text-center" />
            </div>
            <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded h-fit">Apply</button>
          </form>
        )}

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
        <div className="w-full overflow-x-auto pb-8 text-center">
           <Board
             board={displayBoard}
             onCellClick={handleCellClick}
             onCellRightClick={handleRightClick}
             gameStatus={status}
           />
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
                 <button
                   onClick={() => resetGame()}
                   className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all"
                 >
                   Play Again
                 </button>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};
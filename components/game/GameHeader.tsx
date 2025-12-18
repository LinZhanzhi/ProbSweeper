import React from 'react';
import { RefreshCw, Settings, RotateCcw, Camera, Play, StopCircle, Cog, Microscope, Zap, Rocket, ShieldCheck, Brain, Smile, Frown, Glasses } from 'lucide-react';
import { GameStatus, CellData } from '../../types';
import { PLAY_STYLE_FLAGS } from '../../utils/probabilityEngine';
import { SettingsModal } from '../modals/SettingsModal';
import { ShortcutsModal } from '../modals/ShortcutsModal';

interface GameHeaderProps {
  handleGenerateGame: () => void;
  isGenerating: boolean;
  showGameSettings: boolean;
  setShowGameSettings: (show: boolean) => void;
  handleReplay: () => void;
  gameStarted: boolean;
  setIsExporting: (exporting: boolean) => void;
  isExporting: boolean;
  status: GameStatus;
  lastSafeBoard: CellData[][] | null;
  handleUndo: () => void;
  minesLeft: number;
  time: number;
  isAutoMode: boolean;
  setIsAutoMode: (auto: boolean) => void;
  showSolverSettings: boolean;
  setShowSolverSettings: (show: boolean) => void;
  analysisMode: boolean;
  setAnalysisMode: (analysis: boolean) => void;
  isFastAutoMode: boolean;
  setIsFastAutoMode: (fast: boolean) => void;
  isLightSpeedMode: boolean;
  setIsLightSpeedMode: (light: boolean) => void;
  isCertainMode: boolean;
  setIsCertainMode: (certain: boolean) => void;
  lastHint: string | null;
  selectedPreset: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'CUSTOM';
  setSelectedPreset: (preset: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'CUSTOM') => void;
  customConfig: { rows: number; cols: number; mines: number };
  setCustomConfig: (config: { rows: number; cols: number; mines: number }) => void;
  isNoGuessMode: boolean;
  setIsNoGuessMode: (isNoGuess: boolean) => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  handleGenerateGame, isGenerating, showGameSettings, setShowGameSettings,
  handleReplay, gameStarted, setIsExporting, isExporting,
  status, lastSafeBoard, handleUndo, minesLeft, time,
  isAutoMode, setIsAutoMode, showSolverSettings, setShowSolverSettings,
  analysisMode, setAnalysisMode,
  isFastAutoMode, setIsFastAutoMode, isLightSpeedMode, setIsLightSpeedMode,
  isCertainMode, setIsCertainMode, lastHint,
  selectedPreset, setSelectedPreset, customConfig, setCustomConfig,
  isNoGuessMode, setIsNoGuessMode
}) => {
  return (
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

          <button id="export-button" name="export-button" onClick={() => setIsExporting(true)} disabled={isExporting || !gameStarted} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-all shadow-lg hover:shadow-slate-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" title="Export Board Image">
            <Camera size={18} /> {isExporting ? '...' : 'Export'}
          </button>

          <ShortcutsModal />

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

          <SettingsModal
            showGameSettings={showGameSettings}
            selectedPreset={selectedPreset}
            setSelectedPreset={setSelectedPreset}
            customConfig={customConfig}
            setCustomConfig={setCustomConfig}
            isNoGuessMode={isNoGuessMode}
            setIsNoGuessMode={setIsNoGuessMode}
            handleGenerateGame={handleGenerateGame}
          />
        </div>

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
               <button
                 id="solver-fast-mode"
                 name="solver-fast-mode"
                 onClick={() => {
                     setIsFastAutoMode(!isFastAutoMode);
                     if (!isFastAutoMode) setIsLightSpeedMode(false);
                 }}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${isFastAutoMode && !isLightSpeedMode ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                 title="Reduce delay between auto-moves to 0.05s"
               >
                 <Zap size={14} className={isFastAutoMode && !isLightSpeedMode ? "fill-white" : ""} /> Fast Mode
               </button>

               <button
                 id="solver-light-speed-mode"
                 name="solver-light-speed-mode"
                 onClick={() => {
                     setIsLightSpeedMode(!isLightSpeedMode);
                     if (!isLightSpeedMode) setIsFastAutoMode(true);
                 }}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${isLightSpeedMode ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                 title="No delay between moves (Instant)"
               >
                 <Rocket size={14} className={isLightSpeedMode ? "fill-white" : ""} /> Light Speed
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
  );
};

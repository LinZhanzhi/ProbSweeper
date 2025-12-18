import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  showGameSettings: boolean;
  selectedPreset: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'CUSTOM';
  setSelectedPreset: (preset: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'CUSTOM') => void;
  customConfig: { rows: number; cols: number; mines: number };
  setCustomConfig: (config: { rows: number; cols: number; mines: number }) => void;
  isNoGuessMode: boolean;
  setIsNoGuessMode: (isNoGuess: boolean) => void;
  handleGenerateGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  showGameSettings,
  selectedPreset,
  setSelectedPreset,
  customConfig,
  setCustomConfig,
  isNoGuessMode,
  setIsNoGuessMode,
  handleGenerateGame
}) => {
  if (!showGameSettings) return null;

  return (
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
  );
};

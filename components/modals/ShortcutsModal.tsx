import React from 'react';
import { Keyboard } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  return (
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
                <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">Q</span> <span>Toggle Zoom</span>
                <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">W, A, S, D</span> <span>Scroll Board</span>
                <div className="col-span-2 h-px bg-slate-700 my-1"></div>
                <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">Tab</span> <span>Switch Focus</span>
                <span className="font-mono text-slate-200 bg-slate-700 px-1 rounded text-xs">Space</span> <span>Confirm Action</span>
            </div>
        </div>
    </div>
  );
};

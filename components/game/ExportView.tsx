import React from 'react';
import { Board } from '../Board';
import { CellData, GameStatus } from '../../types';
import { Smile, Frown, Glasses, Sparkles } from 'lucide-react';

interface ExportViewProps {
  exportRef: React.RefObject<HTMLDivElement>;
  isExporting: boolean;
  status: GameStatus;
  minesLeft: number;
  time: number;
  finalDisplayBoard: CellData[][];
}

export const ExportView: React.FC<ExportViewProps> = ({
  exportRef, isExporting, status, minesLeft, time, finalDisplayBoard
}) => {
  if (!isExporting) return null;

  return (
    <div style={{ position: 'absolute', left: -9999, top: -9999 }}>
        <div ref={exportRef} className="bg-slate-900 p-8 w-fit h-fit flex flex-col items-center gap-6 border border-slate-700">
            <div className="flex items-center gap-8 bg-slate-800/50 p-4 rounded-xl border border-slate-700 w-full justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-yellow-400 rounded-full border-4 border-yellow-600 flex items-center justify-center shadow-lg">
                        {status === GameStatus.WON ? (
                            <Glasses className="text-black w-7 h-7" />
                        ) : status === GameStatus.LOST ? (
                            <Frown className="text-black w-7 h-7" />
                        ) : (
                            <Smile className="text-black w-7 h-7" />
                        )}
                    </div>
                </div>
                <div className="flex gap-6 font-mono text-3xl font-bold leading-none">
                    <div className="text-red-400 flex items-center gap-3 bg-black/30 px-4 py-2 rounded-lg border border-slate-600">
                        <span className="translate-y-[2px]">💣</span> <span className="-translate-y-[2px]">{String(minesLeft).padStart(3, '0')}</span>
                    </div>
                    <div className="text-green-400 flex items-center gap-3 bg-black/30 px-4 py-2 rounded-lg border border-slate-600">
                        <span className="translate-y-[2px]">⏱️</span> <span className="-translate-y-[2px]">{String(time).padStart(3, '0')}</span>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl">
                <Board
                    board={finalDisplayBoard}
                    onCellClick={() => {}}
                    onCellRightClick={() => {}}
                    onCellMouseEnter={() => {}}
                    onCellMouseLeave={() => {}}
                    gameStatus={status}
                />
            </div>

            <div className="text-slate-500 text-sm font-mono flex items-center gap-2">
                <Sparkles size={14} /> ProbSweeper
            </div>
        </div>
    </div>
  );
};

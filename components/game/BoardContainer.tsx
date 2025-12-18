import React from 'react';
import { Board } from '../Board';
import { BoardConfig, CellData, GameStatus } from '../../types';
import { AlertTriangle, Sparkles } from 'lucide-react';

interface BoardContainerProps {
  boardContainerRef: React.RefObject<HTMLDivElement>;
  isZoomedOut: boolean;
  zoomLevel: number;
  config: BoardConfig;
  CELL_SIZE: number;
  isGenerating: boolean;
  gameStarted: boolean;
  finalDisplayBoard: CellData[][];
  handleCellClick: (r: number, c: number) => void;
  handleRightClick: (e: React.MouseEvent, r: number, c: number) => void;
  handleCellMouseEnter: (r: number, c: number) => void;
  handleCellMouseLeave: (r: number, c: number) => void;
  status: GameStatus;
}

export const BoardContainer: React.FC<BoardContainerProps> = ({
  boardContainerRef, isZoomedOut, zoomLevel, config, CELL_SIZE,
  isGenerating, gameStarted, finalDisplayBoard,
  handleCellClick, handleRightClick, handleCellMouseEnter, handleCellMouseLeave,
  status
}) => {
  return (
      <div className="flex-1 w-full flex items-center justify-center bg-slate-900 p-4 min-h-0 overflow-hidden">
        <div ref={boardContainerRef} className="w-[85%] h-[85%] overflow-auto bg-slate-950 relative flex p-8 border-4 border-slate-800 rounded-xl shadow-2xl">
          <div
            className="m-auto relative transition-all duration-200 ease-out"
            style={{
                width: isZoomedOut ? `${(config.cols * CELL_SIZE + 40) * zoomLevel}px` : 'auto',
                height: isZoomedOut ? `${(config.rows * CELL_SIZE + 40) * zoomLevel}px` : 'auto',
            }}
          >
            <div
                className="origin-top-left transition-transform duration-200 ease-out inline-block"
                style={{
                    transform: isZoomedOut ? `scale(${zoomLevel})` : 'none',
                }}
            >
             {isGenerating && (
                 <div className="absolute inset-0 bg-slate-900/80 z-50 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
                     <Sparkles className="animate-spin text-blue-400 mb-4" size={48} />
                     <h3 className="text-2xl font-bold text-blue-200 animate-pulse">Generating Board...</h3>
                     <p className="text-slate-400 mt-2">Ensuring a fair start</p>
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
                     <AlertTriangle size={48} className="opacity-50" />
                     <p className="text-xl font-semibold">Select "New Game" to start</p>
                 </div>
             )}
            </div>
          </div>
        </div>
      </div>
  );
};

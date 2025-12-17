import React from 'react';
import { Flag, Bomb, Crosshair } from 'lucide-react';
import { CellData, CellState } from '../types';

interface CellProps {
  data: CellData;
  onClick: (r: number, c: number) => void;
  onContextMenu: (e: React.MouseEvent, r: number, c: number) => void;
  onMouseEnter: (r: number, c: number) => void;
  onMouseLeave: (r: number, c: number) => void;
  gameStatus: number; // 3 = LOST
}

const NUMBER_COLORS = [
  '',
  'text-blue-500',
  'text-green-500',
  'text-red-500',
  'text-purple-500',
  'text-amber-600',
  'text-teal-600',
  'text-black',
  'text-gray-600'
];

export const Cell: React.FC<CellProps> = React.memo(({ data, onClick, onContextMenu, onMouseEnter, onMouseLeave, gameStatus }) => {
  const { row, col, state, isMine, neighborMines, probability, isSuggestedStart, isExploded } = data;

  const isRevealed = state === CellState.REVEALED;
  const isFlagged = state === CellState.FLAGGED;
  const isHidden = state === CellState.HIDDEN;

  // Game Over Logic
  const isLost = gameStatus === 3;
  const showMine = isLost && isMine;
  const wrongFlag = isLost && !isMine && isFlagged;

  // Dynamic Classes
  let baseClasses = "w-8 h-8 md:w-10 md:h-10 border flex items-center justify-center font-bold select-none transition-colors duration-75 text-sm md:text-base cursor-pointer relative leading-none";

  if (isRevealed) {
    baseClasses += " bg-gray-200 border-gray-400 border-[1px]";
  } else {
    baseClasses += " bg-[#c0c0c0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-[3px] active:border-[1px] active:border-gray-400";
  }

  if (showMine && !isFlagged) {
    if (isExploded) {
        baseClasses = "w-8 h-8 md:w-10 md:h-10 border border-gray-400 flex items-center justify-center bg-red-500";
    } else {
        baseClasses = "w-8 h-8 md:w-10 md:h-10 border border-gray-400 flex items-center justify-center bg-gray-200";
    }
  }

  const renderContent = () => {
    if (isHidden && probability !== undefined) {
        const probPercent = Math.round(probability * 100);
        let color = 'text-white';
        if (probability === 1) color = 'text-green-600 font-extrabold';
        else if (probability === 0) color = 'text-red-600 font-extrabold';
        else if (probability > 0.8) color = 'text-green-700';
        else if (probability < 0.2) color = 'text-red-700';
        else color = 'text-blue-800';

        return <span className={`text-[10px] md:text-xs ${color} z-10`}>{probPercent}%</span>;
    }

    if (isHidden && isSuggestedStart) {
        return <Crosshair className="w-5 h-5 text-green-600 animate-pulse" />;
    }

    if (isFlagged) {
       return <Flag className={`w-4 h-4 md:w-5 md:h-5 ${wrongFlag ? 'text-red-900' : 'text-red-600 fill-red-600'}`} />;
    }
    if (showMine) {
      return <Bomb className="w-5 h-5 text-black fill-black" />;
    }
    if (isRevealed && neighborMines > 0) {
      return <span className={NUMBER_COLORS[neighborMines]}>{neighborMines}</span>;
    }
    return null;
  };

  return (
    <div
      className={baseClasses}
      onClick={() => onClick(row, col)}
      onContextMenu={(e) => onContextMenu(e, row, col)}
      onMouseEnter={() => onMouseEnter(row, col)}
      onMouseLeave={() => onMouseLeave(row, col)}
      data-row={row}
      data-col={col}
    >
      {renderContent()}
    </div>
  );
});

import React from 'react';
import { CellData } from '../types';
import { Cell } from './Cell';

interface BoardProps {
  board: CellData[][];
  onCellClick: (r: number, c: number) => void;
  onCellRightClick: (e: React.MouseEvent, r: number, c: number) => void;
  gameStatus: number;
}

export const Board: React.FC<BoardProps> = ({ board, onCellClick, onCellRightClick, gameStatus }) => {
  if (!board || board.length === 0) {
    return <div className="text-white p-4">Loading board...</div>;
  }

  return (
    <div className="inline-block bg-[#808080] p-1.5 md:p-3 border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-[3px] shadow-2xl">
      <div 
        className="grid gap-[1px] bg-[#808080]"
        style={{ gridTemplateColumns: `repeat(${board[0].length}, min-content)` }}
      >
        {board.map((row, rIndex) => (
          row.map((cell, cIndex) => (
            <Cell
              key={`${rIndex}-${cIndex}`}
              data={cell}
              onClick={onCellClick}
              onContextMenu={onCellRightClick}
              gameStatus={gameStatus}
            />
          ))
        ))}
      </div>
    </div>
  );
};
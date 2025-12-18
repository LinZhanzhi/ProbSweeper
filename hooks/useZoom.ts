import { useState, useRef } from 'react';
import { BoardConfig } from '../types';

export const useZoom = (config: BoardConfig, CELL_SIZE: number) => {
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const toggleZoom = (hoveredCell: {r: number, c: number} | null) => {
      if (isZoomedOut) {
          // Zoom In
          setIsZoomedOut(false);
          setZoomLevel(1);

          // Restore scroll position to center hovered cell
          if (hoveredCell && boardContainerRef.current) {
              const container = boardContainerRef.current;
              // Calculate target position (center of cell)
              const targetY = hoveredCell.r * CELL_SIZE + CELL_SIZE / 2;
              const targetX = hoveredCell.c * CELL_SIZE + CELL_SIZE / 2;

              // Calculate scroll position to center the target
              const scrollTop = targetY - container.clientHeight / 2;
              const scrollLeft = targetX - container.clientWidth / 2;

              // Use setTimeout to allow render to update layout first
              setTimeout(() => {
                  container.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'auto' });
              }, 0);
          }
      } else {
          // Zoom Out
          if (boardContainerRef.current) {
              const container = boardContainerRef.current;
              // Available space inside padding (p-8 = 32px * 2 = 64px)
              const availableWidth = container.clientWidth - 64;
              const availableHeight = container.clientHeight - 64;

              const boardWidth = config.cols * CELL_SIZE + 40;
              const boardHeight = config.rows * CELL_SIZE + 40;

              const scaleX = availableWidth / boardWidth;
              const scaleY = availableHeight / boardHeight;

              // Use the smaller scale to fit both dimensions, max 1
              const newScale = Math.min(scaleX, scaleY, 1);

              setZoomLevel(newScale);
              setIsZoomedOut(true);

              // Reset scroll to top-left so the centered board is visible
              container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          }
      }
  };

  return {
    isZoomedOut, setIsZoomedOut,
    zoomLevel, setZoomLevel,
    boardContainerRef,
    toggleZoom
  };
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { getBoardProbabilities } from '../utils/solver';
import { GameStatus } from '../types';
import { useGameLogic, PRESETS } from '../hooks/useGameLogic';
import { useAutoSolver } from '../hooks/useAutoSolver';
import { useZoom } from '../hooks/useZoom';
import { GameHeader } from './game/GameHeader';
import { BoardContainer } from './game/BoardContainer';
import { ConfirmationModal } from './modals/ConfirmationModal';
import { ExportView } from './game/ExportView';


export const Game: React.FC = () => {
  // 1. Game Logic Hook
  const {
    config, setConfig,
    board, setBoard,
    status, setStatus,
    minesLeft, setMinesLeft,
    time, setTime,
    gameStarted, setGameStarted,
    isGenerating, setIsGenerating,
    generationStatus, setGenerationStatus,
    suggestedStart, setSuggestedStart,
    isReplay, setIsReplay,
    lastSafeBoard, setLastSafeBoard,
    isNoGuessMode, setIsNoGuessMode,
    resetGame,
    handleCellClick,
    handleRightClick,
    handleReplay,
    handleUndo
  } = useGameLogic();

  // 2. Local UI State (that didn't move to hooks)
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'CUSTOM'>('BEGINNER');
  const [customConfig, setCustomConfig] = useState({ rows: 50, cols: 50, mines: 400 });
  const [showSolverSettings, setShowSolverSettings] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{r: number, c: number} | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'replay' | 'newGame';
    focus: 'confirm' | 'cancel';
  }>({ isOpen: false, type: 'newGame', focus: 'confirm' });
  const [gameOverFocus, setGameOverFocus] = useState<'undo' | 'replay' | 'newGame'>('undo');
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const CELL_SIZE = 40;

  // 3. Auto Solver Hook
  const {
    isAutoMode, setIsAutoMode,
    isFastAutoMode, setIsFastAutoMode,
    isLightSpeedMode, setIsLightSpeedMode,
    isCertainMode, setIsCertainMode,
    solverMode, setSolverMode,
    isProcessing,
    lastHint, setLastHint,
    analysisMode, setAnalysisMode
  } = useAutoSolver({
    board, setBoard, status, setStatus, minesLeft, setMinesLeft, config,
    isNoGuessMode, isReplay, handleCellClick, handleRightClick
  });

  // 4. Zoom Hook
  const {
    isZoomedOut, setIsZoomedOut,
    zoomLevel, setZoomLevel,
    boardContainerRef,
    toggleZoom
  } = useZoom(config, CELL_SIZE);

  // 5. Derived State (Display Board)
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

  const finalDisplayBoard = useMemo(() => {
      return displayBoard.map((row, r) => row.map((cell, c) => ({
          ...cell,
          isSuggestedStart: suggestedStart && suggestedStart.r === r && suggestedStart.c === c
      })));
  }, [displayBoard, suggestedStart]);

  // 6. Handlers
  const handleGenerateGame = () => {
      let newConfig = PRESETS.BEGINNER;
      if (selectedPreset === 'INTERMEDIATE') newConfig = PRESETS.INTERMEDIATE;
      if (selectedPreset === 'EXPERT') newConfig = PRESETS.EXPERT;
      if (selectedPreset === 'CUSTOM') {
          newConfig = {
            rows: Math.min(100, Math.max(5, customConfig.rows)),
            cols: Math.min(100, Math.max(5, customConfig.cols)),
            mines: Math.min(Math.floor(customConfig.rows * customConfig.cols * 0.8), Math.max(1, customConfig.mines))
          };
      }
      setConfig(newConfig);
      resetGame(newConfig);
      setShowGameSettings(false);
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    setHoveredCell({ r, c });
  };

  const handleCellMouseLeave = (r: number, c: number) => {
    setHoveredCell(prev => (prev && prev.r === r && prev.c === c ? null : prev));
  };

  // Export Effect
  useEffect(() => {
      if (isExporting && exportRef.current) {
          const performExport = async () => {
              try {
                  const canvas = await html2canvas(exportRef.current!, {
                      backgroundColor: '#0f172a',
                      scale: 1,
                      logging: false,
                  });
                  const link = document.createElement('a');
                  link.download = `minesweeper-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.png`;
                  link.href = canvas.toDataURL();
                  link.click();
              } catch (err) {
                  console.error("Export failed", err);
                  alert("Failed to export image. See console for details.");
              } finally {
                  setIsExporting(false);
              }
          };
          setTimeout(performExport, 100);
      }
  }, [isExporting]);

  // Reset focus when game is lost
  useEffect(() => {
      if (status === GameStatus.LOST) {
          setGameOverFocus('undo');
      }
  }, [status]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (confirmationModal.isOpen) {
        e.preventDefault();
        if (e.key === 'Tab') {
          setConfirmationModal(prev => ({
            ...prev,
            focus: prev.focus === 'confirm' ? 'cancel' : 'confirm'
          }));
        } else if (e.key === ' ') {
          if (confirmationModal.focus === 'confirm') {
            if (confirmationModal.type === 'replay') handleReplay();
            else handleGenerateGame();
          }
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } else if (e.key === 'Escape') {
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }
        return;
      }

      if (status === GameStatus.LOST) {
          if (e.key === 'Tab') {
              e.preventDefault();
              setGameOverFocus(prev => {
                  if (prev === 'undo') return 'replay';
                  if (prev === 'replay') return 'newGame';
                  return 'undo';
              });
          } else if (e.key === ' ') {
              e.preventDefault();
              if (gameOverFocus === 'undo') handleUndo();
              if (gameOverFocus === 'replay') handleReplay();
              if (gameOverFocus === 'newGame') resetGame();
          }
          return;
      }

      if (e.key.toLowerCase() === 'f') {
        if (hoveredCell) {
            handleRightClick(null, hoveredCell.r, hoveredCell.c);
        }
      } else if (e.key.toLowerCase() === 'e') {
        if (hoveredCell) {
            handleCellClick(hoveredCell.r, hoveredCell.c);
        }
      } else if (e.key.toLowerCase() === 'r') {
        setConfirmationModal({ isOpen: true, type: 'replay', focus: 'confirm' });
      } else if (e.key.toLowerCase() === 't') {
        setConfirmationModal({ isOpen: true, type: 'newGame', focus: 'confirm' });
      } else if (e.key.toLowerCase() === 'h') {
        setAnalysisMode(!analysisMode);
      } else if (e.key.toLowerCase() === 'q') {
          toggleZoom(hoveredCell);
      }

      const SCROLL_AMOUNT = 200;
      if (e.key.toLowerCase() === 'w') {
          boardContainerRef.current?.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
      } else if (e.key.toLowerCase() === 's') {
          boardContainerRef.current?.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });
      } else if (e.key.toLowerCase() === 'a') {
          boardContainerRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
      } else if (e.key.toLowerCase() === 'd') {
          boardContainerRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCell, confirmationModal, handleRightClick, handleCellClick, handleReplay, handleGenerateGame, status, gameOverFocus, lastSafeBoard, resetGame, isZoomedOut, config, CELL_SIZE, analysisMode, toggleZoom]);

  return (
    <div className="h-screen w-full bg-slate-900 text-gray-100 font-sans flex flex-col overflow-hidden">
      <GameHeader
        handleGenerateGame={handleGenerateGame}
        isGenerating={isGenerating}
        showGameSettings={showGameSettings}
        setShowGameSettings={setShowGameSettings}
        handleReplay={handleReplay}
        gameStarted={gameStarted}
        setIsExporting={setIsExporting}
        isExporting={isExporting}
        status={status}
        lastSafeBoard={lastSafeBoard}
        handleUndo={handleUndo}
        minesLeft={minesLeft}
        time={time}
        isAutoMode={isAutoMode}
        setIsAutoMode={setIsAutoMode}
        showSolverSettings={showSolverSettings}
        setShowSolverSettings={setShowSolverSettings}
        analysisMode={analysisMode}
        setAnalysisMode={setAnalysisMode}
        solverMode={solverMode}
        setSolverMode={setSolverMode}
        isFastAutoMode={isFastAutoMode}
        setIsFastAutoMode={setIsFastAutoMode}
        isLightSpeedMode={isLightSpeedMode}
        setIsLightSpeedMode={setIsLightSpeedMode}
        isCertainMode={isCertainMode}
        setIsCertainMode={setIsCertainMode}
        lastHint={lastHint}
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        customConfig={customConfig}
        setCustomConfig={setCustomConfig}
        isNoGuessMode={isNoGuessMode}
        setIsNoGuessMode={setIsNoGuessMode}
      />

      <BoardContainer
        boardContainerRef={boardContainerRef}
        isZoomedOut={isZoomedOut}
        zoomLevel={zoomLevel}
        config={config}
        CELL_SIZE={CELL_SIZE}
        isGenerating={isGenerating}
        gameStarted={gameStarted}
        finalDisplayBoard={finalDisplayBoard}
        handleCellClick={handleCellClick}
        handleRightClick={handleRightClick}
        handleCellMouseEnter={handleCellMouseEnter}
        handleCellMouseLeave={handleCellMouseLeave}
        status={status}
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        type={confirmationModal.type}
        focus={confirmationModal.focus}
        onConfirm={() => {
            if (confirmationModal.type === 'replay') handleReplay();
            else handleGenerateGame();
            setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ExportView
        exportRef={exportRef}
        isExporting={isExporting}
        status={status}
        minesLeft={minesLeft}
        time={time}
        finalDisplayBoard={finalDisplayBoard}
      />
    </div>
  );
};

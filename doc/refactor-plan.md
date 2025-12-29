# Refactoring Plan for ProbSweeper

This document outlines the plan to refactor the codebase to improve maintainability, readability, and structure. The primary focus is on breaking down monolithic files and organizing components and utilities.

## 1. Project Structure Reorganization

We will adopt a more modular structure, grouping related files together.

```
src/
  components/
    game/
      Game.tsx              # Main container (orchestrator)
      GameHeader.tsx        # Top bar with controls and stats
      GameControls.tsx      # Buttons (New Game, Replay, etc.)
      GameStats.tsx         # Mine count, Timer, Face icon
      BoardContainer.tsx    # Scrollable/Zoomable board wrapper
      ExportView.tsx        # Hidden view for image export
    modals/
      SettingsModal.tsx     # Game difficulty settings
      GameOverModal.tsx     # Win/Loss confirmation
      ShortcutsModal.tsx    # Keyboard shortcuts info
    ui/                     # Generic UI components (if any)
  hooks/
    useGameLogic.ts         # Core game state (board, status, mines, time)
    useAutoSolver.ts        # Auto-solver loop and logic
    useGameControls.ts      # Handlers for clicks, keyboard, etc.
    useZoom.ts              # Zoom and scroll logic
  utils/
    math/
      PrimeSieve.ts         # Extracted from probabilityEngine.ts
      Binomial.ts           # Extracted from probabilityEngine.ts (includes Cache)
    solver/
      ProbabilityEngine.ts  # Core engine logic (cleaned up)
      SolverAdapter.ts      # Adapter classes (TileAdapter, BoardAdapter)
      ...other solver files
```

## 2. Refactoring `components/Game.tsx`

`Game.tsx` is currently ~1000 lines and handles too many responsibilities. We will split it into:

### A. Custom Hooks (Logic Extraction)
1.  **`useGameLogic`**:
    *   **State**: `board`, `status`, `minesLeft`, `time`, `config`.
    *   **Actions**: `resetGame`, `handleCellClick`, `handleRightClick`.
    *   **Responsibility**: Manages the rules of Minesweeper.

2.  **`useAutoSolver`**:
    *   **State**: `isAutoMode`, `isFastAutoMode`, `isLightSpeedMode`, `solverMode`.
    *   **Effect**: The `useEffect` loop that runs the solver.
    *   **Responsibility**: Interfacing between the game state and the `getNextBestMove` utility.

3.  **`useZoom`**:
    *   **State**: `isZoomedOut`, `zoomLevel`.
    *   **Actions**: `toggleZoom`, `calculateZoom`.
    *   **Responsibility**: Handling the visual transformation of the board container.

### B. Sub-Components (UI Extraction)
1.  **`GameHeader`**:
    *   Contains `GameControls` and `GameStats`.
    *   Receives props for current game state and callbacks for actions.

2.  **`BoardContainer`**:
    *   Handles the `overflow-auto` div, the `ref`, and the `transform` styles for zooming.
    *   Renders the `Board` component inside.

3.  **`Modals`**:
    *   Move the "Game Settings" dropdown/modal to `SettingsModal`.
    *   Move the "Confirmation" modal to `ConfirmationModal`.
    *   Move the "Keyboard Shortcuts" tooltip to `ShortcutsInfo`.

## 3. Refactoring `utils/probabilityEngine.ts`

`probabilityEngine.ts` is ~3000 lines and contains generic math classes mixed with specific solver logic.

### A. Extract Math Utilities
1.  **`utils/math/PrimeSieve.ts`**:
    *   Move the `PrimeSieve` class here.
    *   It is a generic mathematical utility.

2.  **`utils/math/Binomial.ts`**:
    *   Move `Binomial`, `BinomialCache`, and `BinomialEntry` classes here.
    *   These are generic combinatorics utilities.

### B. Organize Solver Logic
1.  **`utils/solver/ProbabilityEngine.ts`**:
    *   Keep the main `ProbabilityEngine` class here.
    *   Import `PrimeSieve` and `Binomial` from the new math utils.
    *   This file should focus solely on the constraint satisfaction and probability logic.

## 4. Execution Steps

1.  **Create Directories**: Set up `components/game`, `components/modals`, `hooks`, `utils/math`.
2.  **Extract Math Utils**: Move `PrimeSieve` and `Binomial` classes first. Update imports in `probabilityEngine.ts`.
3.  **Extract Hooks**:
    *   Create `useGameLogic` and move state/handlers from `Game.tsx`.
    *   Create `useAutoSolver` and move the solver effect.
4.  **Extract Components**:
    *   Create `GameHeader` and move the top bar JSX.
    *   Create `BoardContainer` and move the board wrapper JSX.
5.  **Clean up `Game.tsx`**: Re-assemble the game using the new hooks and components.
6.  **Verify**: Ensure all features (Game, Solver, Zoom, Export, Shortcuts) work exactly as before.

## 5. Future Considerations
-   Add unit tests for the extracted math utilities.
-   Add unit tests for the `useGameLogic` hook.
-   Consider using a Context API if prop drilling becomes too complex between `Game` and its sub-components.

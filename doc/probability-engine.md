# Probability Engine Documentation

## Overview
The `ProbabilityEngine` is the core logic component of the Minesweeper solver. Unlike simple heuristic solvers that look for basic patterns (like "1-2-1"), this engine calculates the **exact mathematical probability** of every cell being a mine. It uses a combination of **Constraint Satisfaction** and **Combinatorics**.

## Core Concepts

To perform calculations efficiently, the engine abstracts the board into groups rather than processing individual tiles.

### 1. The Box (`Box`)
*   **Definition**: A group of unrevealed tiles that share the *exact same* set of adjacent numbered neighbors (witnesses).
*   **Significance**: Mathematically, every tile in a Box is identical. If a Box has 5 tiles and the solver determines there are 2 mines in that Box, each tile has exactly a $2/5$ (40%) chance of being a mine.
*   **Optimization**: This drastically reduces the number of variables the solver needs to handle.

### 2. The Witness (`BoxWitness`)
*   **Definition**: A revealed tile with a number.
*   **Role**: It acts as a **constraint**. For example, a "2" touching Box A and Box B creates the equation: `Mines(A) + Mines(B) = 2`.

### 3. The Probability Line (`ProbabilityLine`)
*   **Definition**: Represents one valid "timeline" or configuration of the game board that satisfies the constraints processed so far.
*   **Data**:
    *   **Mine Distribution**: "In this scenario, Box A has 1 mine, Box B has 2 mines..."
    *   **Solution Count**: The number of ways this specific scenario can occur (calculated using combinatorics).

## The Algorithm

The engine solves the board by treating it as a system of linear equations with integer constraints.

### Step 1: Initialization
1.  The engine scans the board.
2.  It identifies all **Witnesses** (numbered tiles).
3.  It groups all adjacent hidden tiles into **Boxes**.
4.  It validates the board state (e.g., ensuring no negative mines).

### Step 2: The Solver Loop (`process`)
The engine starts with a single "empty" Probability Line (0 mines everywhere) and iteratively processes witnesses.

1.  **Select Witness**: Picks a witness that hasn't been processed yet.
2.  **Merge Constraints (`mergeProbabilities`)**:
    *   It takes the existing Probability Lines.
    *   It checks how many mines are already placed next to the current witness in each line.
    *   It calculates how many *more* mines are needed to satisfy the witness.
    *   It distributes these missing mines into the new Boxes adjacent to the witness.
3.  **Branching**: If there are multiple ways to satisfy a witness (e.g., a "1" touching two empty boxes), the Probability Line splits into multiple new lines.
4.  **Combinatorics**: When placing $k$ mines into a Box of size $n$, the number of ways to do this is calculated using the binomial coefficient $\binom{n}{k}$. The Solution Count is updated:
    $$ \text{NewSolutionCount} = \text{OldSolutionCount} \times \binom{n}{k} $$
5.  **Crunching**: To prevent memory explosion, the engine periodically merges Probability Lines that result in the same mine counts for the active boundary.

### Step 3: Independent Edge Handling
If the board has separated clusters of numbers (e.g., top-left corner and bottom-right corner), the engine identifies them as **Independent Witnesses**. It solves each cluster separately and then mathematically combines the results. This is a crucial optimization for large boards.

## The Calculation (The Math)

The engine derives the percentage chance of a tile being a mine using the **Law of Total Probability**.

### The Formula
$$ P(\text{tile is mine}) = \frac{\text{Total Valid Solutions where tile is a mine}}{\text{Total Valid Solutions}} $$

### Detailed Steps (`calculateBoxProbabilities`)

1.  **Total Solutions ($T$)**:
    The engine sums the solution counts of every valid Probability Line.
    *   **Global Constraint**: It accounts for the total number of mines in the game. If a scenario uses $M_{edge}$ mines on the edge, and there are $M_{total}$ mines in the game, then $M_{total} - M_{edge}$ mines must be in the unknown (off-edge) area.
    *   The solution count is multiplied by the ways to place the remaining mines in the unknown area: $\binom{\text{UnknownTiles}}{\text{RemainingMines}}$.

2.  **Box Tally ($T_{box}$)**:
    For each Box, the engine sums the solution counts weighted by the number of mines in that Box for that scenario.

3.  **Final Probability**:
    For a tile in Box $i$:
    $$ P_i = \frac{T_{box\_i}}{T \times \text{SizeOfBox}_i} $$

### Precision
*   **BigInt**: The engine uses `BigInt` for all internal counters because the number of combinations can easily exceed the limit of standard 64-bit integers (e.g., $10^{50}$ solutions).
*   **Exactness**: This is not a Monte Carlo simulation. The probabilities are exact to the precision of the floating-point division at the very last step.

## Advanced Features

### Dead Tile Analysis
*   **Concept**: A "Dead" tile is a safe tile that, if revealed, provides **zero** new information to help solve the rest of the board.
*   **Detection**: The engine checks if the tile's value is mathematically forced to be the same in every possible solution for its neighbors.
*   **Usage**: The solver avoids clicking these tiles unless necessary, as they don't help progress the game state.

### 50/50 Detection
*   **Unavoidable Guess**: The engine explicitly looks for patterns where a guess is mathematically unavoidable.
*   **Logic**: If two tiles are remaining and one is a mine, and they share the exact same relationships with all neighbors, it is a pure 50/50. No future move elsewhere on the board can distinguish them.

### Binomial Caching
*   Calculating $\binom{n}{k}$ repeatedly is computationally expensive.
*   The engine uses a `BinomialCache` to pre-calculate and store these values for instant retrieval.

## Code Structure (`utils/probabilityEngine.ts`)

*   **`ProbabilityEngine`**: The main class containing the solver logic.
*   **`Box`**: Represents a group of equivalent tiles.
*   **`BoxWitness`**: Represents a constraint (numbered tile).
*   **`ProbabilityLine`**: Represents a valid mine configuration.
*   **`process()`**: The main entry point for the calculation.
*   **`calculateBoxProbabilities()`**: The final step that aggregates the data into percentages.


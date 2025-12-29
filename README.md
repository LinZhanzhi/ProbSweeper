# ProbSweeper: Advanced Probabilistic Minesweeper

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19.0-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)

**ProbSweeper** is a modern, high-performance implementation of the classic Minesweeper game, engineered with a focus on algorithmic solving and mathematical precision.

Beyond standard gameplay, this project features a custom-built **Probability Engine** that calculates the exact safety percentage of every tile in real-time, allowing for perfect play optimization.

## 🚀 Key Features

-   **🤖 Dual-Layer Solver**:
    -   **Constraint Satisfaction Engine**: Instantly identifies 100% safe moves and guaranteed mines.
    -   **Probability Tank**: When no safe moves exist, it calculates the statistically safest guess using local probability density.
-   **⚡ Modern Tech Stack**: Built with React 19, TypeScript, and Tailwind CSS for a responsive, type-safe experience.
-   **📱 Cross-Platform**: Runs as a high-performance web app or a native Windows desktop application via Electron.
-   **🎨 Advanced Gameplay**: Includes Chording, Safe Start guarantees, and custom board sizes (up to 50x50).

## 🛠️ Technical Highlights

This project was built to explore complex state management and algorithmic efficiency in React.

### The Probability Engine
Located in `utils/probabilityEngine.ts`, the solver doesn't just guess. It models the board as a system of linear constraints:
1.  **Witness Analysis**: Groups tiles into "Boxes" based on shared constraints.
2.  **Combinatorial Search**: Calculates all valid mine configurations for the boundary tiles.
3.  **Dead Tile Detection**: Identifies tiles that offer zero information gain, optimizing the decision tree.

### AI Integration
Th
### Prerequisites
-   Node.js (v16+)
-   npm or yarn

### Quick Start (Web)

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/Gemini-Minesweeper.git
    cd Gemini-Minesweeper
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to play.

### Desktop App (Electron)

To build the standalone Windows application:

```bash
npm run dist
```
The installer will be generated in the `release/` folder.

## 🔑 Environment Configuration

To enable the AI features, you need a Google Gemini API Key.

├── components/        # React UI components (Board, Cell, Game)
├── hooks/            # Custom hooks (useGameLogic, useAutoSolver)
├── services/         # External API integrations (Gemini)
├── utils/            # Core algorithms
│   ├── probabilityEngine.ts  # The math brain
│   ├── solver.ts             # Solver orchestration
│   └── boardGenerator.ts     # Safe-start board generation
└── electron/         # Electron main process
```

## 🤝 Contributing

Cont
## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

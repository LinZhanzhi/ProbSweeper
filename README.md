# Gemini Minesweeper

A modern, AI-enhanced version of the classic Minesweeper game built with React, TypeScript, and Tailwind CSS. It features a built-in probabilistic auto-solver and integrates with Google's Gemini API for smart hints.

## Features

*   **Classic Gameplay**: Familiar Minesweeper mechanics with Left Click to reveal and Right Click to flag.
*   **Chording**: Click on a revealed number to reveal all adjacent hidden cells if the correct number of flags are placed.
*   **Safe Start**: The first click is guaranteed to be safe (and usually opens an area).
*   **Auto-Finish Mode**: A built-in heuristic solver that calculates probabilities and plays the game for you. It uses:
    *   **Certainty Pass**: Identifies 100% safe moves and mines based on constraint satisfaction.
    *   **Probability Pass**: Uses a local probability tank algorithm to guess the safest cell when stuck.
*   **Gemini AI Hints**: Ask the Gemini AI model for a second opinion on the best move.
*   **Custom Boards**: Create custom board sizes (up to 50x50) and mine counts.
*   **Responsive Design**: Works on desktop and mobile.

## How to Play

1.  **Reveal**: Left-click a cell.
2.  **Flag**: Right-click a cell to mark it as a mine.
3.  **Chord**: If a number cell (e.g., '2') has exactly 2 flags around it, click the number itself to reveal the remaining neighbors.
4.  **Auto Finish**: Click the "Auto Finish Mode" button to watch the AI solve the board.
5.  **Gemini Hint**: Click "Ask Gemini Hint" if you are stuck and want an LLM's perspective.

## Setup & Run

This project is built using standard web technologies.

### Prerequisites

*   Node.js (v16 or higher recommended)
*   npm or yarn

### Installation

1.  Clone the repository or download the files.
2.  Navigate to the project directory.
3.  Install dependencies (if using a local bundler like Vite or Parcel).
    ```bash
    npm install
    ```

### Running

Since this project uses ES modules and imports from CDNs (via `importmap` in `index.html`), it can be run directly with a simple static file server, or wrapped in a bundler.

**Method 1: Simple Server (Recommended for quick preview)**

You can use `serve`, `http-server`, or Python's built-in server.

```bash
# Python 3
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Method 2: Using Vite**

If you want to convert this to a full Vite project:
1.  Run `npm create vite@latest`
2.  Select React + TypeScript.
3.  Copy the `src` files into the new project.
4.  Ensure `API_KEY` is set in your `.env` file for Gemini features.

## Building the Desktop App (Electron)

This project includes an Electron wrapper to package the game as a standalone desktop application (`.exe` installer for Windows).

### Prerequisites
*   Ensure you have installed all dependencies:
    ```bash
    npm install
    ```

### Build Command
To build the Windows installer:
```bash
npm run dist
```

This command will:
1.  Build the React web application (`npm run build`).
2.  Package the application using `electron-builder`.
3.  Output the installer and executable in the `release/` directory.

### Development Mode
To run the Electron app in development mode (with hot-reloading):

1.  Start the Vite dev server in one terminal:
    ```bash
    npm run dev
    ```
2.  Start Electron in a second terminal:
    ```bash
    # PowerShell
    $env:NODE_ENV="development"; npm run electron:dev

    # Bash
    NODE_ENV=development npm run electron:dev
    ```

## Environment Variables

To use the Gemini Hint feature, you must have a Google Gemini API Key.

If running locally with a bundler that supports environment variables (like Vite), create a `.env` file:

```
API_KEY=your_gemini_api_key_here
```

*Note: In the current static version, the API key is expected to be available in `process.env.API_KEY`. If running in a browser-only environment without a build step that injects this, the Gemini feature may not work unless you manually configure the client.*

## Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **AI**: Google GenAI SDK (`@google/genai`)

## License

MIT

import { GoogleGenAI } from "@google/genai";
import { CellData, CellState, SolverMove } from '../types';

const getAiClient = () => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not found in environment variables");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getGeminiHint = async (board: CellData[][]): Promise<SolverMove | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  // Convert board to string representation to save tokens and be explicit
  // R = Revealed (number), F = Flag, H = Hidden
  let boardStr = "Current Board State:\n";
  const rows = board.length;
  const cols = board[0].length;
  
  boardStr += `Size: ${rows}x${cols}\n`;
  
  for (let r = 0; r < rows; r++) {
    let rowStr = "";
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.state === CellState.FLAGGED) {
        rowStr += "[F]";
      } else if (cell.state === CellState.HIDDEN) {
        rowStr += "[?]";
      } else {
        rowStr += `[${cell.neighborMines}]`;
      }
    }
    boardStr += rowStr + "\n";
  }

  const prompt = `
    You are an expert Minesweeper solver. Analyze the following board.
    Coordinates are 0-indexed: (row, column).
    [?] = Hidden, [F] = Flag, [N] = Revealed with N mines around.

    ${boardStr}

    Identify the single best move. 
    Prioritize 100% safe moves.
    If no safe moves exist, identify the cell with the lowest probability of being a mine.
    
    Return ONLY a JSON object with this structure (no markdown):
    {
      "row": number,
      "col": number,
      "action": "reveal" | "flag",
      "reasoning": "short explanation"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const move = JSON.parse(text) as SolverMove;
    return move;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

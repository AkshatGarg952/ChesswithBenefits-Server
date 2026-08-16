import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';

let client = null;

function getModel() {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!client) {
    client = new GoogleGenerativeAI(env.geminiApiKey);
  }
  return client.getGenerativeModel({ model: 'gemini-1.5-flash' }, { timeout: 10000 });
}

export async function getGeminiCommentary(prompt) {
  const result = await getModel().generateContent(prompt);
  return result.response.text()?.trim() || 'No commentary generated.';
}

export function getPromptTemplate(mode, { move, fen, lastMoves = [], isUserMove }) {
  const moveList = lastMoves.join(', ');

  if (mode === 'beginner') {
    return `You're a friendly chess coach helping a beginner. Move played: ${move}. FEN: ${fen}. Last moves: ${moveList}. Give helpful advice in 1-2 spoken-style sentences without suggesting exact next moves.`;
  }

  if (mode === 'roast') {
    return `You're a sarcastic chess commentator. The player just made the move: ${move}. Roast them in a funny one-liner. No profanity. FEN: ${fen}.`;
  }

  if (mode === 'hype') {
    return `You're a high-energy esports commentator. Move played: ${move}. FEN: ${fen}. Last moves: ${moveList}. The move was by the ${isUserMove ? 'player' : 'opponent'}. Make it dramatic in one exciting spoken-style sentence.`;
  }

  return 'Describe the move in an interesting way.';
}

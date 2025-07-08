// /utils/geminiAPI.js
import fetch from "node-fetch";

 async function getGeminiCommentary(prompt) {
  const API_KEY = process.env.GEMINI_API_KEY;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return reply?.trim() || "No commentary generated.";
}


function getPromptTemplate(mode, { move, fen, lastMoves = [], isUserMove }) {
  const moveList = lastMoves.join(", ");

  if (mode === "beginner") {
    return `You're a friendly chess coach helping a beginner. Move played: ${move}. FEN: ${fen}. Last moves: ${moveList}. Give helpful advice in 1-2 spoken-style sentences without suggesting exact next moves.`;
  }

  if (mode === "roast") {
    return `You're a sarcastic chess commentator. The player just made the move: ${move}. Roast them in a funny one-liner. No profanity. FEN: ${fen}.`;
  }

  if (mode === "hype") {
    return `You're a high-energy esports commentator. Move played: ${move}. FEN: ${fen}. Last moves: ${moveList}. The move was by the ${isUserMove ? "player" : "opponent"}. Make it dramatic in one exciting spoken-style sentence.`;
  }

  return "Describe the move in an interesting way.";
}

export {getGeminiCommentary, getPromptTemplate}
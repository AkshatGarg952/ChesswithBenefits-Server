import { spawn } from 'child_process';
import { Chess } from 'chess.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const STOCKFISH_PATH = path.resolve(__dirname, 'stockfish.exe');

function createEngine() {
  if (!fs.existsSync(STOCKFISH_PATH)) {
    throw new Error(`Stockfish binary not found at: ${STOCKFISH_PATH}`);
  }

  const engine = spawn(STOCKFISH_PATH);

  engine.stderr.on('data', (data) => {
    console.error('Stockfish error:', data.toString());
  });

  engine.on('error', (err) => {
    console.error('Failed to start Stockfish:', err.message);
  });

  return engine;
}

function evaluatePosition(engine, fen) {
  return new Promise((resolve) => {
    engine.stdin.write('ucinewgame\n');
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write('go depth 15\n');

    engine.stdout.on('data', (data) => {
      const line = data.toString();
      // console.log('Engine:', line); // Uncomment to debug

      if (line.includes('score cp')) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
          resolve(parseInt(match[1]));
        }
      } else if (line.includes('score mate')) {
        resolve(1000); // Very strong advantage for mate
      }
    });
  });
}

export default async function analyzeMove(game, previousMoves, currentMove) {
  const chess = new Chess();
  previousMoves.forEach((m) => chess.move(m));

  const positionBefore = chess.fen();
  chess.move(currentMove);
  const positionAfter = chess.fen();

  const engine = createEngine();
  const bestEval = await evaluatePosition(engine, positionBefore);
  const playedEval = await evaluatePosition(engine, positionAfter);
  engine.kill();

  const evalLoss = Math.abs(playedEval - bestEval);

  let moveQuality = '';
  if (evalLoss < 50) moveQuality = 'Best';
  else if (evalLoss < 100) moveQuality = 'Good';
  else if (evalLoss < 300) moveQuality = 'Inaccurate';
  else if (evalLoss < 600) moveQuality = 'Mistake';
  else moveQuality = 'Blunder';

  return { moveQuality, evalLoss };
}

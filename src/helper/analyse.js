import { spawn } from 'child_process';
import { Chess } from 'chess.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const STOCKFISH_PATH = path.resolve(__dirname, 'stockfish');

function createEngine() {
  const engine = spawn(STOCKFISH_PATH);

  engine.stderr.on('data', (data) => {
    console.error('Stockfish error:', data.toString());
  });

  engine.on('error', (err) => {
    console.error('❌ Failed to start Stockfish:', err.message);
  });

  return engine;
}

function evaluatePosition(engine, fen) {
  return new Promise((resolve) => {
    let bestEval = null;

    engine.stdout.on('data', (data) => {
      const line = data.toString().trim();

      if (line.includes('score cp')) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) bestEval = parseInt(match[1], 10);
      } else if (line.includes('score mate')) {
        bestEval = 1000; // Assign high value for mate
      }

      if (line.includes('bestmove')) {
        resolve(bestEval);
      }
    });

    engine.stdin.write('uci\n');
    engine.stdin.write('ucinewgame\n');
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write('go depth 15\n');
  });
}

export default async function analyzeMove(game, previousMoves, currentMove) {
  const chess = new Chess();
  previousMoves.forEach((m) => chess.move(m));

  const positionBefore = chess.fen();
  chess.move(currentMove);
  const positionAfter = chess.fen();

  const engine1 = createEngine();
  const engine2 = createEngine();

  const [bestEval, playedEval] = await Promise.all([
    evaluatePosition(engine1, positionBefore),
    evaluatePosition(engine2, positionAfter),
  ]);

  engine1.kill();
  engine2.kill();

  const evalLoss = Math.abs((playedEval ?? 0) - (bestEval ?? 0));

  let moveQuality = '';
  if (evalLoss < 50) moveQuality = 'Best';
  else if (evalLoss < 100) moveQuality = 'Good';
  else if (evalLoss < 300) moveQuality = 'Inaccurate';
  else if (evalLoss < 600) moveQuality = 'Mistake';
  else moveQuality = 'Blunder';

  return { moveQuality, evalLoss };
}

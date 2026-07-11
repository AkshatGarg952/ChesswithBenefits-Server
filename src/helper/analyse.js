import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';

// FIX: Use the 'stockfish' npm package instead of a platform-specific binary.
// The package ships stockfish.js which runs under Node.js on any OS (Windows, Linux, macOS).
// This fixes deployment on Linux servers (Render, Heroku, etc.) where stockfish.exe would not work.
const require = createRequire(import.meta.url);

let STOCKFISH_JS_PATH;
try {
  // Resolve path to the bundled stockfish.js inside the npm package
  STOCKFISH_JS_PATH = require.resolve('stockfish/bin/stockfish.js');
} catch {
  STOCKFISH_JS_PATH = null;
  console.warn('[analyse] stockfish npm package not found. Move analysis will be disabled.');
}

function createEngine() {
  if (!STOCKFISH_JS_PATH) return null;
  try {
    // Spawn: node <path-to-stockfish.js>
    const engine = spawn(process.execPath, [STOCKFISH_JS_PATH]);

    engine.stderr.on('data', (data) => {
      console.error('Stockfish stderr:', data.toString());
    });

    engine.on('error', (err) => {
      console.error('Failed to start Stockfish process:', err.message);
    });

    return engine;
  } catch (error) {
    console.error('Could not spawn Stockfish process:', error);
    return null;
  }
}

function evaluatePosition(engine, fen) {
  if (!engine) return Promise.resolve(null);

  return new Promise((resolve) => {
    let bestEval = null;

    // Safety timeout — if Stockfish stalls, resolve after 8 seconds
    const timeout = setTimeout(() => {
      console.warn('[analyse] Stockfish timed out, returning null eval');
      resolve(bestEval);
    }, 8000);

    const onData = (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('score cp')) {
          const match = trimmed.match(/score cp (-?\d+)/);
          if (match) bestEval = parseInt(match[1], 10);
        } else if (trimmed.includes('score mate')) {
          // Assign a large absolute value so evalLoss is computed correctly for mates
          bestEval = 10000;
        }

        if (trimmed.startsWith('bestmove')) {
          clearTimeout(timeout);
          engine.stdout.off('data', onData);
          resolve(bestEval);
          return;
        }
      }
    };

    engine.stdout.on('data', onData);

    engine.once('exit', () => { clearTimeout(timeout); resolve(bestEval); });
    engine.once('error', () => { clearTimeout(timeout); resolve(null); });

    try {
      engine.stdin.write('uci\n');
      engine.stdin.write('ucinewgame\n');
      engine.stdin.write(`position fen ${fen}\n`);
      engine.stdin.write('go depth 12\n'); // depth 12 balances speed vs accuracy on a server
    } catch (err) {
      console.error('[analyse] Error writing to Stockfish stdin:', err);
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

export default async function analyzeMove(game, previousMoves, currentMove) {
  const chess = new Chess();
  previousMoves.forEach((m) => chess.move(m));

  const positionBefore = chess.fen();

  // Apply current move to get positionAfter
  const moveResult = chess.move(currentMove);
  if (!moveResult) {
    // If the move itself is invalid, just return a safe default
    return { moveQuality: 'Good', evalLoss: 0 };
  }
  const positionAfter = chess.fen();

  const engine1 = createEngine();
  const engine2 = createEngine();

  if (!engine1 || !engine2) {
    console.warn('[analyse] Stockfish unavailable, skipping move quality analysis.');
    if (engine1) engine1.kill();
    if (engine2) engine2.kill();
    return { moveQuality: 'Good', evalLoss: 0 };
  }

  try {
    const [bestEval, playedEval] = await Promise.all([
      evaluatePosition(engine1, positionBefore),
      evaluatePosition(engine2, positionAfter),
    ]);

    try { engine1.kill(); } catch {}
    try { engine2.kill(); } catch {}

    if (bestEval === null || playedEval === null) {
      return { moveQuality: 'Good', evalLoss: 0 };
    }

    const evalLoss = Math.abs((playedEval ?? 0) - (bestEval ?? 0));

    let moveQuality;
    if (evalLoss < 50)       moveQuality = 'Best';
    else if (evalLoss < 100) moveQuality = 'Good';
    else if (evalLoss < 300) moveQuality = 'Inaccurate';
    else if (evalLoss < 600) moveQuality = 'Mistake';
    else                     moveQuality = 'Blunder';

    console.log(`[analyse] evalLoss=${evalLoss} → quality=${moveQuality}`);
    return { moveQuality, evalLoss };
  } catch (error) {
    console.error('[analyse] Analysis failure:', error);
    try { engine1.kill(); } catch {}
    try { engine2.kill(); } catch {}
    return { moveQuality: 'Good', evalLoss: 0 };
  }
}

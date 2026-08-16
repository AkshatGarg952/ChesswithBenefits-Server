import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Uses the 'stockfish' npm package instead of a platform-specific binary.
// The package ships stockfish.js which runs under Node.js on any OS (Windows, Linux, macOS),
// which matters for deployment on Linux servers.
const require = createRequire(import.meta.url);

let STOCKFISH_JS_PATH;
try {
  STOCKFISH_JS_PATH = require.resolve('stockfish/bin/stockfish.js');
} catch {
  STOCKFISH_JS_PATH = null;
  logger.warn('[analyse] stockfish npm package not found. Move analysis is disabled.');
}

// A forced mate is worth more than any centipawn advantage, but keeping it finite
// means eval differences around mates still classify sensibly.
const MATE_SCORE = 10000;

// Centipawn value of each piece, used only by the sacrifice heuristic below.
const PIECE_VALUE = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

function createEngine() {
  if (!STOCKFISH_JS_PATH) return null;
  try {
    const engine = spawn(process.execPath, [STOCKFISH_JS_PATH]);
    engine.stderr.on('data', (data) => logger.warn('[analyse] stockfish stderr:', data.toString().trim()));
    engine.on('error', (err) => logger.warn('[analyse] stockfish process error:', err.message));
    return engine;
  } catch (error) {
    logger.warn('[analyse] could not spawn stockfish:', error.message);
    return null;
  }
}

/**
 * Evaluates a position and resolves to a centipawn score **from the perspective
 * of the side to move** (that is how UCI reports `score cp` / `score mate`).
 * Resolves to null if the engine stalls, dies, or never reports a score.
 */
function evaluatePosition(engine, fen) {
  return new Promise((resolve) => {
    let score = null;
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      engine.stdout.off('data', onData);
      engine.off('exit', onExit);
      resolve(value);
    };

    const timer = setTimeout(() => {
      logger.warn('[analyse] stockfish timed out');
      finish(score);
    }, env.stockfish.timeoutMs);

    const onData = (data) => {
      for (const line of data.toString().split('\n')) {
        const trimmed = line.trim();

        const mate = trimmed.match(/score mate (-?\d+)/);
        if (mate) {
          // Sign matters: `mate -3` means the side to move is getting mated, and
          // `mate 0` is a position that is already checkmate — also a loss.
          score = Number(mate[1]) > 0 ? MATE_SCORE : -MATE_SCORE;
        } else {
          const cp = trimmed.match(/score cp (-?\d+)/);
          if (cp) score = parseInt(cp[1], 10);
        }

        if (trimmed.startsWith('bestmove')) {
          finish(score);
          return;
        }
      }
    };

    const onExit = () => finish(score);

    engine.stdout.on('data', onData);
    engine.once('exit', onExit);

    try {
      engine.stdin.write('ucinewgame\n');
      engine.stdin.write(`position fen ${fen}\n`);
      engine.stdin.write(`go depth ${env.stockfish.depth}\n`);
    } catch (err) {
      logger.warn('[analyse] error writing to stockfish stdin:', err.message);
      finish(null);
    }
  });
}

function classify(evalLoss) {
  if (evalLoss < 50) return 'Best';
  if (evalLoss < 100) return 'Good';
  if (evalLoss < 300) return 'Inaccurate';
  if (evalLoss < 600) return 'Mistake';
  return 'Blunder';
}

/**
 * Heuristic (not an engine verdict): a move is "brilliant" when it is essentially
 * the best move available *and* it deliberately hands the opponent material —
 * the opponent can immediately capture on the destination square for more than
 * the move just won. Cheap to compute and it never runs the engine again.
 */
function isSacrifice(chessAfterMove, moveResult) {
  const gained = moveResult.captured ? PIECE_VALUE[moveResult.captured] : 0;
  const risked = PIECE_VALUE[moveResult.piece] ?? 0;

  const recapture = chessAfterMove
    .moves({ verbose: true })
    .some((reply) => reply.to === moveResult.to && reply.captured);

  return recapture && risked - gained >= 200;
}

/**
 * Grades a single move. Returns null when the engine is unavailable or gives no
 * usable score — callers must not record a quality in that case, otherwise every
 * unanalysed move silently inflates the player's "Good" count.
 */
export default async function analyzeMove(previousMoves, currentMove) {
  const chess = new Chess();

  let positionBefore;
  let moveResult;
  try {
    for (const m of previousMoves) chess.move(m);
    positionBefore = chess.fen();
    // chess.js throws on an illegal move instead of returning null.
    moveResult = chess.move(currentMove);
  } catch {
    return null;
  }

  const positionAfter = chess.fen();

  const engine = createEngine();
  if (!engine) return null;

  try {
    // Sequential, on one engine: two concurrent Stockfish processes per move
    // multiplied by every game in flight is far more load than this needs.
    const bestEval = await evaluatePosition(engine, positionBefore);
    const playedEval = await evaluatePosition(engine, positionAfter);

    if (bestEval === null || playedEval === null) return null;

    // Both scores are from their own side-to-move's perspective, and the side to
    // move flips across the move — so the played position is worth -playedEval to
    // the mover. Comparing them without that flip (as this used to) inverts the
    // result and makes every grade meaningless.
    const evalLoss = Math.max(0, bestEval + playedEval);

    let moveQuality = classify(evalLoss);
    if (moveQuality === 'Best' && -playedEval > -100 && isSacrifice(chess, moveResult)) {
      moveQuality = 'Brilliant';
    }

    return { moveQuality, evalLoss };
  } catch (error) {
    logger.error('[analyse] analysis failure:', error);
    return null;
  } finally {
    try { engine.kill(); } catch { /* already gone */ }
  }
}

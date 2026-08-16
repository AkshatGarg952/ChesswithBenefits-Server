import { Chess } from 'chess.js';
import { Types } from 'mongoose';
import Game from '../features/games/game.schema.js';
import analyzeMove from '../helper/analyse.js';
import { logger } from '../utils/logger.js';
import { getRoom, setRoom } from './rooms.store.js';
import { withGameLock } from './game.lock.js';

const STARTING_TIME = 600;

const otherColor = (color) => (color === 'white' ? 'black' : 'white');

/**
 * Tells every player in the room how the game ended, from their own point of view.
 * Each client gets 'win' | 'lose' | 'draw' — the values the UI actually renders.
 */
function emitGameOver(io, roomId, { reason, winnerId }) {
  const winner = winnerId ? winnerId.toString() : null;

  for (const player of getRoom(roomId)) {
    io.to(player.socketId).emit('gameOver', {
      reason,
      winner,
      status: !winner ? 'draw' : player.userId === winner ? 'win' : 'lose',
    });
  }
}

/** Loads a game and confirms the caller is one of its two players. */
async function loadGameForPlayer(gameId, userId) {
  if (!gameId || !Types.ObjectId.isValid(gameId)) return { error: 'Invalid game id.' };

  const game = await Game.findById(gameId);
  if (!game) return { error: 'Cannot find the game' };

  if (game.playerWhite.toString() !== userId && game.playerBlack.toString() !== userId) {
    return { error: 'You are not a player in this game.' };
  }

  return { game };
}

/**
 * Grades the move after it has already been broadcast. Analysis takes seconds,
 * so it must never sit between the player's move and the opponent seeing it.
 * Uses $inc rather than saving a stale document.
 */
async function recordMoveQuality(gameId, previousMoves, move, moverColor) {
  try {
    const analysis = await analyzeMove(previousMoves, move);
    if (!analysis?.moveQuality) return;

    const side = moverColor === 'white' ? 'playerWhite' : 'playerBlack';
    await Game.updateOne({ _id: gameId }, { $inc: { [`${analysis.moveQuality}.${side}`]: 1 } });
  } catch (error) {
    logger.error('Move analysis error:', error);
  }
}

export function registerGameHandlers(io, socket) {
  // Queues the task behind any other work on the same game, and absorbs the
  // result: these are fire-and-forget socket handlers, and an unhandled
  // rejection would take the whole process down (see server.js).
  const serialize = (gameId, task) => {
    withGameLock(gameId, task).catch((error) => logger.error('Game task failed:', error));
  };

  // Authenticated at the handshake (see sockets/index.js) — never trust a userId
  // sent in the event payload, it would let anyone act as anyone.
  const userId = socket.data.userId;

  socket.on('joinRoom', async ({ roomId, color }) => {
    try {
      if (!roomId) {
        socket.emit('errorMessage', 'Invalid request: roomId is required.');
        return;
      }

      const existingPlayers = getRoom(roomId);

      // The same socket asking twice is not an error — React's StrictMode fires
      // mount effects twice in development, and a retry after a flaky emit looks
      // identical. Only the same user on a *different* socket is a real clash.
      const alreadyHere = existingPlayers.find((player) => player.userId === userId);
      if (alreadyHere) {
        if (alreadyHere.socketId === socket.id) {
          socket.emit('assignedColor', alreadyHere.color);
          return;
        }
        socket.emit('errorMessage', 'You are already in this room.');
        return;
      }

      if (existingPlayers.length >= 2) {
        socket.emit('errorMessage', 'Room is full.');
        return;
      }

      const takenColors = existingPlayers.map((p) => p.color);
      let assignedColor = color;
      if (!assignedColor || assignedColor === 'random') {
        assignedColor = existingPlayers.length === 0
          ? (Math.random() < 0.5 ? 'white' : 'black')
          : otherColor(takenColors[0]);
      }

      if (takenColors.includes(assignedColor)) {
        socket.emit('errorMessage', `Color ${assignedColor} already taken.`);
        return;
      }

      const players = [...existingPlayers, { socketId: socket.id, userId, color: assignedColor }];
      setRoom(roomId, players);
      socket.join(roomId);
      socket.data.roomId = roomId;

      socket.emit('assignedColor', assignedColor);
      socket.to(roomId).emit('playerJoined', { message: `${userId} joined as ${assignedColor}` });

      if (players.length !== 2) return;

      const firstPlayer = players.find((p) => p.socketId !== socket.id);
      if (!firstPlayer) return;

      // Which side places the WebRTC call is decided by colour on the client
      // (black dials), so no instruction is needed here.
      io.to(firstPlayer.socketId).emit('opponentJoined', {
        message: `${userId} joined as ${assignedColor}`,
        opponentSocketId: socket.id,
        opponentUserId: userId,
        opponentColor: assignedColor,
      });

      socket.emit('opponentJoined', {
        message: `${firstPlayer.userId} is already here as ${firstPlayer.color}`,
        opponentSocketId: firstPlayer.socketId,
        opponentUserId: firstPlayer.userId,
        opponentColor: firstPlayer.color,
      });

      const whitePlayer = players.find((p) => p.color === 'white');
      const blackPlayer = players.find((p) => p.color === 'black');

      if (!whitePlayer || !blackPlayer) {
        socket.emit('errorMessage', 'Error setting up game.');
        return;
      }

      let game = await Game.findOne({
        $or: [
          { playerWhite: whitePlayer.userId, playerBlack: blackPlayer.userId },
          { playerWhite: blackPlayer.userId, playerBlack: whitePlayer.userId },
        ],
        status: 'onGoing',
      });

      if (!game) {
        game = await Game.create({
          playerWhite: whitePlayer.userId,
          playerBlack: blackPlayer.userId,
          moves: [],
          status: 'onGoing',
          winner: null,
          whiteTimeLeft: STARTING_TIME,
          blackTimeLeft: STARTING_TIME,
          turn: 'white',
          lastMoveTimestamp: Date.now(),
        });
        logger.info(`Created game ${game._id} for room ${roomId}`);
      } else {
        // The clock kept running while nobody was connected; don't charge that
        // time to whoever happened to be on move.
        game.lastMoveTimestamp = Date.now();
        await game.save();
        logger.info(`Resumed game ${game._id} for room ${roomId}`);
      }

      const chess = new Chess();
      for (const move of game.moves) chess.move(move);

      players.forEach((player) => {
        const opponent = players.find((p) => p.socketId !== player.socketId);
        io.to(player.socketId).emit('bothPlayersJoined', {
          gameId: game._id.toString(),
          moves: game.moves,
          fen: chess.fen(),
          opponentSocketId: opponent?.socketId || null,
          opponentUserId: opponent?.userId || null,
          opponentColor: opponent?.color || null,
          whiteTimeLeft: game.whiteTimeLeft,
          blackTimeLeft: game.blackTimeLeft,
        });
      });
    } catch (error) {
      logger.error('joinRoom error:', error);
      socket.emit('errorMessage', 'An error occurred while joining the room.');
    }
  });

  socket.on('Draw', ({ roomId }) => {
    if (!roomId || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit('Opponent Draw');
  });

  socket.on('DrawDeclined', ({ roomId }) => {
    if (!roomId || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit('DrawDeclined');
  });

  socket.on('Resign', ({ roomId, gameId }) => serialize(gameId, async () => {
    try {
      const { game, error } = await loadGameForPlayer(gameId, userId);
      if (error) {
        socket.emit('errorMessage', error);
        return;
      }

      if (game.status !== 'onGoing') {
        socket.emit('errorMessage', 'Game is no longer active.');
        return;
      }

      game.status = 'finished';
      game.winner = game.playerWhite.toString() === userId ? game.playerBlack : game.playerWhite;
      await game.save();

      socket.to(roomId).emit('Opponent Resign');
      emitGameOver(io, roomId, { reason: 'resign', winnerId: game.winner });
    } catch (error) {
      logger.error('Resign error:', error);
      socket.emit('errorMessage', 'An error occurred while resigning.');
    }
  }));

  socket.on('DrawAccepted', ({ roomId, gameId }) => serialize(gameId, async () => {
    try {
      const { game, error } = await loadGameForPlayer(gameId, userId);
      if (error) {
        socket.emit('errorMessage', error);
        return;
      }

      if (game.status !== 'onGoing') {
        socket.emit('errorMessage', 'Game is no longer active.');
        return;
      }

      game.status = 'draw';
      game.winner = null;
      await game.save();

      socket.to(roomId).emit('DrawAccepted');
      emitGameOver(io, roomId, { reason: 'agreement', winnerId: null });
    } catch (error) {
      logger.error('DrawAccepted error:', error);
      socket.emit('errorMessage', 'An error occurred while accepting draw.');
    }
  }));

  /**
   * A player whose opponent's clock has visibly run out asks the server to end
   * the game. The server re-derives the elapsed time itself, so a client that
   * lies (or whose local clock is skewed) gets nowhere.
   */
  socket.on('claimTimeout', ({ roomId, gameId }) => serialize(gameId, async () => {
    try {
      const { game, error } = await loadGameForPlayer(gameId, userId);
      if (error || game.status !== 'onGoing') return;

      const chess = new Chess();
      for (const m of game.moves) chess.move(m);

      const sideToMove = chess.turn() === 'w' ? 'white' : 'black';
      const clockKey = sideToMove === 'white' ? 'whiteTimeLeft' : 'blackTimeLeft';
      const elapsed = Math.max(0, Math.floor((Date.now() - game.lastMoveTimestamp) / 1000));

      if (game[clockKey] - elapsed > 0) return;

      game[clockKey] = 0;
      game.status = 'finished';
      game.winner = sideToMove === 'white' ? game.playerBlack : game.playerWhite;
      await game.save();

      emitGameOver(io, roomId, { reason: 'timeout', winnerId: game.winner });
    } catch (error) {
      logger.error('claimTimeout error:', error);
    }
  }));

  // Serialised per game: without it, two moves arriving close together both read
  // the pre-move document and the second is rejected or overwrites the first.
  socket.on('SendMove', ({ move, gameId, roomId }) => serialize(gameId, async () => {
    try {
      if (!roomId) {
        socket.emit('moveRejected', { error: 'Invalid room.' });
        return;
      }

      const { game, error } = await loadGameForPlayer(gameId, userId);
      if (error) {
        socket.emit('moveRejected', { error });
        return;
      }

      if (game.status !== 'onGoing') {
        socket.emit('moveRejected', { error: 'Game is no longer active.' });
        return;
      }

      // The move list is the only authority on whose turn it is; game.turn is a
      // convenience copy and must never be the thing the clock keys off.
      const chess = new Chess();
      for (const m of game.moves) chess.move(m);

      const moverColor = chess.turn() === 'w' ? 'white' : 'black';
      const moverId = moverColor === 'white' ? game.playerWhite : game.playerBlack;

      if (moverId.toString() !== userId) {
        socket.emit('moveRejected', { error: 'Not your turn!' });
        return;
      }

      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - game.lastMoveTimestamp) / 1000));
      const clockKey = moverColor === 'white' ? 'whiteTimeLeft' : 'blackTimeLeft';
      game[clockKey] = Math.max(0, game[clockKey] - elapsed);

      if (game[clockKey] === 0) {
        game.status = 'finished';
        game.winner = moverColor === 'white' ? game.playerBlack : game.playerWhite;
        await game.save();
        emitGameOver(io, roomId, { reason: 'timeout', winnerId: game.winner });
        return;
      }

      const previousMoves = [...game.moves];

      // chess.js throws on an illegal move rather than returning null, so this
      // has to be a catch — a falsy check never fires.
      let result;
      try {
        result = chess.move(move);
      } catch {
        socket.emit('moveRejected', { error: 'Illegal move!' });
        return;
      }

      game.moves.push(result.san);
      game.turn = otherColor(moverColor);
      game.lastMoveTimestamp = now;

      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          game.status = 'finished';
          game.winner = moverColor === 'white' ? game.playerWhite : game.playerBlack;
        } else {
          game.status = 'draw';
          game.winner = null;
        }
      }

      await game.save();

      // To the whole room, including the mover: they need the authoritative FEN,
      // both clocks, and — when they just delivered mate — the result.
      io.to(roomId).emit('receiveMove', {
        by: userId,
        move: result,
        fen: chess.fen(),
        gameStatus: game.status,
        winner: game.winner ? game.winner.toString() : null,
        allMoves: game.moves,
        whiteTimeLeft: game.whiteTimeLeft,
        blackTimeLeft: game.blackTimeLeft,
      });

      if (game.status !== 'onGoing') {
        emitGameOver(io, roomId, {
          reason: game.status === 'draw' ? 'draw' : 'checkmate',
          winnerId: game.winner,
        });
      }

      recordMoveQuality(game._id, previousMoves, move, moverColor);
    } catch (err) {
      logger.error('SendMove error:', err);
      socket.emit('moveRejected', { error: 'Server error.' });
    }
  }));
}

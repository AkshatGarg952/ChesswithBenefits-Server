import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { registerGameHandlers } from './game.socket.js';
import { registerChatHandlers } from './chat.socket.js';
import { registerWebRTCHandlers } from './webrtc.socket.js';
import { getRoom, setRoom, deleteRoom } from './rooms.store.js';

export function registerSocketHandlers(io) {
  // Every socket carries a verified user identity. Without this, the userId in a
  // move/resign payload is just a claim, and anyone could play or end someone
  // else's game by guessing an id.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized: no token provided'));

    try {
      const payload = jwt.verify(token, env.jwtSecret);
      socket.data.userId = payload.id;
      next();
    } catch {
      next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user ${socket.data.userId})`);

    registerGameHandlers(io, socket);
    registerChatHandlers(socket);
    registerWebRTCHandlers(io, socket);

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;

      if (roomId) {
        const players = getRoom(roomId);
        const opponent = players.find((p) => p.socketId !== socket.id);
        const remaining = players.filter((p) => p.socketId !== socket.id);

        if (remaining.length === 0) {
          deleteRoom(roomId);
        } else {
          setRoom(roomId, remaining);
        }

        if (opponent) {
          io.to(opponent.socketId).emit('opponent-disconnected', { opponentSocketId: socket.id });
        }
      }

      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}

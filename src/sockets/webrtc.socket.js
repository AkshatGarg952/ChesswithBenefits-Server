import { getRoom } from './rooms.store.js';

// Thin 1:1 signaling relay — the server never inspects offer/answer/ICE payloads,
// it just forwards them to the opponent. It does check that the target really is
// the opponent, so a socket can't push signaling traffic at arbitrary clients.
const isOpponent = (socket, targetSocketId) =>
  Boolean(targetSocketId) &&
  targetSocketId !== socket.id &&
  getRoom(socket.data.roomId).some((player) => player.socketId === targetSocketId);

export function registerWebRTCHandlers(io, socket) {
  socket.on('call-user', ({ targetSocketId, offer }) => {
    if (!offer || !isOpponent(socket, targetSocketId)) return;
    io.to(targetSocketId).emit('incoming-call', { from: socket.id, offer });
  });

  socket.on('answer-call', ({ targetSocketId, answer }) => {
    if (!answer || !isOpponent(socket, targetSocketId)) return;
    io.to(targetSocketId).emit('call-answered', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    if (!candidate || !isOpponent(socket, targetSocketId)) return;
    io.to(targetSocketId).emit('ice-candidate', { from: socket.id, candidate });
  });
}

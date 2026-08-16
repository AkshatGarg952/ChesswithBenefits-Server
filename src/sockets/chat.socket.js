const MAX_MESSAGE_LENGTH = 1000;

export function registerChatHandlers(socket) {
  socket.on('SendMessage', ({ message, roomId }) => {
    // Only relay into the room this socket actually joined — otherwise any client
    // could broadcast into a stranger's game by guessing its room id.
    if (!roomId || socket.data.roomId !== roomId) return;
    if (typeof message !== 'string') return;

    const text = message.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return;

    socket.to(roomId).emit('ReceiveMessage', { message: text, time: new Date().toISOString() });
  });
}

// In-memory matchmaking room registry: roomId -> [{ socketId, userId, color }].
// Process-local by design (see README for the horizontal-scaling caveat).
const rooms = new Map();

export const getRoom = (roomId) => rooms.get(roomId) || [];
export const setRoom = (roomId, players) => rooms.set(roomId, players);
export const deleteRoom = (roomId) => rooms.delete(roomId);

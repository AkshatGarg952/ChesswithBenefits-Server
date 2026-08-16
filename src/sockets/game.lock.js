// Every handler that mutates a game does read-modify-write: load the document,
// replay the moves, then save. Two of those running concurrently for the same
// game interleave — the second one reads state the first has not written yet, so
// a legal move gets rejected as "not your turn", or one of the two saves wins and
// the other move is silently lost.
//
// Serialising per game id removes the window. The rooms registry is already
// process-local (see rooms.store.js), so an in-process queue is the right scope;
// running multiple server instances would need a shared lock instead.
const queues = new Map();

export function withGameLock(gameId, task) {
  const key = String(gameId);
  const previous = queues.get(key) || Promise.resolve();

  // Run whether or not the previous task settled cleanly — one failure must not
  // stall every later move on that game.
  const result = previous.then(task, task);

  const tail = result.then(() => {}, () => {});
  queues.set(key, tail);
  tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });

  return result;
}

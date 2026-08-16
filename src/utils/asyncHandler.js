// Wraps an async route/controller handler so rejected promises are forwarded
// to Express's error-handling middleware instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

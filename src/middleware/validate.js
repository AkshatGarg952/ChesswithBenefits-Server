// Validates req.body against a zod schema, replacing the parsed/coerced
// value back onto req.body so controllers can trust its shape.
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues[0]?.message || 'Invalid request body.' });
  }
  req.body = result.data;
  next();
};

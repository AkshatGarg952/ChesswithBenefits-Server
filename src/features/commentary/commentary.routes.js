import express from 'express';
import rateLimit from 'express-rate-limit';
import { postCommentary } from './commentary.controller.js';
import jwtAuth from '../../middleware/jwt.auth.js';
import { validateBody } from '../../middleware/validate.js';
import { commentaryRequestSchema } from './commentary.validation.js';

const commentaryRouter = express.Router();

// Every call costs a Gemini request, so it is behind auth and a per-user budget
// rather than open to the internet.
const commentaryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { message: 'Commentary rate limit reached, please slow down.' },
});

commentaryRouter.post('/', jwtAuth, commentaryLimiter, validateBody(commentaryRequestSchema), postCommentary);

export default commentaryRouter;

import { getGeminiCommentary, getPromptTemplate } from './commentary.service.js';
import { logger } from '../../utils/logger.js';

export async function postCommentary(req, res) {
  const { mode, move, fen, lastMoves, isUserMove } = req.body.prompt;
  try {
    const prompt = getPromptTemplate(mode, { move, fen, lastMoves, isUserMove });
    const commentary = await getGeminiCommentary(prompt);
    res.status(200).json({ commentary });
  } catch (err) {
    logger.error('Error generating commentary:', err.message);
    res.status(502).json({ message: 'Failed to generate commentary' });
  }
}

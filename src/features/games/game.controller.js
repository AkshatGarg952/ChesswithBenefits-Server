import GameRepository from './game.repository.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/appError.js';

const gameRepository = new GameRepository();

// Stats are personal: being logged in is not enough, it has to be your own id.
const assertOwnStats = (req) => {
  if (req.user.id !== req.params.userId) {
    throw new AppError('You are not allowed to view these statistics.', 403);
  }
};

export const getGameStatsByUserId = asyncHandler(async (req, res) => {
  assertOwnStats(req);
  const stats = await gameRepository.getGameStatsByUserId(req.params.userId);
  res.status(200).json(stats);
});

export const getMoveStatsByUserId = asyncHandler(async (req, res) => {
  assertOwnStats(req);
  const stats = await gameRepository.getMoveStatsByUserId(req.params.userId);
  res.status(200).json(stats);
});

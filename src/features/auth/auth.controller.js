import User from '../users/user.schema.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/appError.js';

// The token has already been verified by the jwtAuth middleware on this route.
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found.', 404);

  res.json({ user });
});

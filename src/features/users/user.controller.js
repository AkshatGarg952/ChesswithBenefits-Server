import jwt from 'jsonwebtoken';
import UserRepository from './user.repository.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/appError.js';

const userRepository = new UserRepository();

const signToken = (userId) => jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '1h' });

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const profileImage = req.file?.path;

  const user = await userRepository.register({
    username,
    email,
    password,
    ...(profileImage && { profileImage }),
  });
  const token = signToken(user._id);

  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userRepository.login(email, password);
  const token = signToken(user._id);

  res.status(200).json({ user, token });
});

export const getDetails = asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id) {
    throw new AppError('You are not allowed to view this profile.', 403);
  }

  const user = await userRepository.details(req.params.id);
  res.status(200).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id) {
    throw new AppError('You are not allowed to update this profile.', 403);
  }

  const updates = {};
  if (req.body.username) updates.username = req.body.username;
  if (req.body.email) updates.email = req.body.email;
  if (req.body.password) updates.password = req.body.password;
  if (req.file?.path) updates.profileImage = req.file.path;

  const updatedUser = await userRepository.update(req.params.id, updates);
  res.status(200).json(updatedUser);
});

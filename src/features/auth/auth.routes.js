import express from 'express';
import { getCurrentUser } from './auth.controller.js';
import jwtAuth from '../../middleware/jwt.auth.js';

const authRouter = express.Router();

authRouter.get('/me', jwtAuth, getCurrentUser);

export default authRouter;

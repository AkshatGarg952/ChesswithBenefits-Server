import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getDetails, updateUser } from './user.controller.js';
import { upload } from '../../middleware/multer.middleware.js';
import jwtAuth from '../../middleware/jwt.auth.js';
import { validateBody } from '../../middleware/validate.js';
import { validateObjectId } from '../../middleware/validateObjectId.js';
import { registerSchema, loginSchema, updateUserSchema } from './user.validation.js';

const userRouter = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

userRouter.post('/register', authLimiter, upload.single('profileImage'), validateBody(registerSchema), register);

userRouter.post('/login', authLimiter, validateBody(loginSchema), login);

userRouter.get('/details/:id', jwtAuth, validateObjectId('id'), getDetails);

userRouter.post(
  '/update/:id',
  jwtAuth,
  validateObjectId('id'),
  upload.single('profileImage'),
  validateBody(updateUserSchema),
  updateUser
);

export default userRouter;

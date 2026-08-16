import express from 'express';
import { getGameStatsByUserId, getMoveStatsByUserId } from './game.controller.js';
import jwtAuth from '../../middleware/jwt.auth.js';
import { validateObjectId } from '../../middleware/validateObjectId.js';

const gameRouter = express.Router();

gameRouter.get('/history/:userId', jwtAuth, validateObjectId('userId'), getGameStatsByUserId);
gameRouter.get('/moveshistory/:userId', jwtAuth, validateObjectId('userId'), getMoveStatsByUserId);

export default gameRouter;

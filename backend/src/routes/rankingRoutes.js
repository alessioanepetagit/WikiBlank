import { Router } from 'express';
import { getRankings } from '../controllers/rankingController.js';

export const rankingRouter = Router();

rankingRouter.get('/rankings', getRankings);

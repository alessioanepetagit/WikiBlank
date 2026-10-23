import { Router } from 'express';
import { enforceAuthentication, optionalAuthentication } from '../middleware/auth.js';
import { gameCreationLimiter } from '../middleware/rateLimit.js';
import {
  abandonGame,
  getGame,
  guessTitle,
  guessWord,
  listGames,
  startGame,
} from '../controllers/gameController.js';

export const gameRouter = Router();

gameRouter.get('/games', optionalAuthentication, listGames);
gameRouter.post('/games', enforceAuthentication, gameCreationLimiter, startGame);
gameRouter.get('/games/:id', optionalAuthentication, getGame);
gameRouter.post('/games/:id/word-guesses', enforceAuthentication, guessWord);
gameRouter.post('/games/:id/title-guesses', enforceAuthentication, guessTitle);
gameRouter.post('/games/:id/abandon', enforceAuthentication, abandonGame);

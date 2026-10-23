import { Router } from 'express';
import { login, registerUser } from '../controllers/authController.js';
import { loginLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/users', registerUser);
authRouter.post('/login', loginLimiter, login);

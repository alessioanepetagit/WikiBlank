import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { HttpError } from './errors.js';

function limiter(windowMs, limit, description) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !config.rateLimitEnabled,
    handler: (req, res, next) => next(new HttpError(429, description)),
  });
}

/** Mitiga il brute-force delle credenziali. */
export const loginLimiter = limiter(15 * 60 * 1000, 30, 'Troppi tentativi di accesso, riprova più tardi');
/** Ogni nuova partita genera una richiesta verso Wikipedia: ne limitiamo il ritmo. */
export const gameCreationLimiter = limiter(60 * 1000, 20, 'Stai creando troppe partite, riprova tra poco');

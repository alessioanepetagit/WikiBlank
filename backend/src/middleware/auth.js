import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from './errors.js';

export function issueToken(user) {
  return jwt.sign({ username: user.username }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
  });
}

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

function authenticate(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    return { id: Number(payload.sub), username: payload.username };
  } catch {
    throw new HttpError(401, 'Token non valido o scaduto');
  }
}

/** Richiede un token valido: 401 se assente o non valido. */
export function enforceAuthentication(req, res, next) {
  const token = readBearerToken(req);
  if (!token) throw new HttpError(401, 'Autenticazione richiesta');
  req.user = authenticate(token);
  next();
}

/** Il token è facoltativo, ma se presente deve essere valido (401 altrimenti). */
export function optionalAuthentication(req, res, next) {
  const token = readBearerToken(req);
  if (token) req.user = authenticate(token);
  next();
}

import bcrypt from 'bcryptjs';
import { UniqueConstraintError } from 'sequelize';
import { User } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';
import { issueToken } from '../middleware/auth.js';

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const BCRYPT_ROUNDS = 10;
// Hash fittizio: permette di eseguire sempre un confronto bcrypt, anche se l'utente non esiste
// (evita di rivelare, dal tempo di risposta, quali username sono registrati).
const DUMMY_HASH = bcrypt.hashSync('password-fittizia', BCRYPT_ROUNDS);

function requireCredentials(body) {
  const { username, password } = body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'username e password sono obbligatori');
  }
  if (username.trim() === '' || password === '') {
    throw new HttpError(400, 'username e password sono obbligatori');
  }
  return { username: username.trim(), password };
}

/** POST /users: registra un nuovo utente. */
export async function registerUser(req, res) {
  const { username, password } = requireCredentials(req.body);
  if (!USERNAME_REGEX.test(username)) {
    throw new HttpError(400, 'username: da 3 a 20 caratteri tra lettere, cifre e underscore');
  }
  // bcrypt considera solo i primi 72 byte
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new HttpError(400, 'password: da 8 a 72 caratteri');
  }
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ username, passwordHash });
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new HttpError(409, 'Username già in uso');
    }
    throw err;
  }
}

/** POST /login: verifica le credenziali ed emette un JWT. */
export async function login(req, res) {
  const { username, password } = requireCredentials(req.body);
  const user = await User.findOne({ where: { username } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    throw new HttpError(401, 'Credenziali non valide');
  }
  res.json({ token: issueToken(user), username: user.username });
}

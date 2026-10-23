import { Op } from 'sequelize';
import { Game, User } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';
import { fetchRandomArticle } from '../services/wiki/index.js';
import {
  countOccurrences,
  isTitleCorrect,
  isValidTitleGuess,
  isValidWordGuess,
  normalizeWord,
  toGameSummary,
  toGameView,
} from '../services/gameEngine.js';

const LIST_STATUSES = ['concluded', 'in-progress', 'won', 'abandoned'];

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'Partita non trovata');
  return id;
}

function parsePositiveInt(value, name, fallback, max) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || (max && n > max)) {
    throw new HttpError(400, `${name} non valido`);
  }
  return n;
}

async function findGame(id) {
  const game = await Game.findByPk(id, { include: { model: User, as: 'player', attributes: ['username'] } });
  if (!game) throw new HttpError(404, 'Partita non trovata');
  return game;
}

/** Recupera una partita in corso e verifica che appartenga all'utente autenticato. */
async function findOwnActiveGame(req) {
  const game = await findGame(parseId(req));
  if (game.userId !== req.user.id) {
    throw new HttpError(403, 'Non puoi modificare la partita di un altro giocatore');
  }
  if (game.status !== 'in-progress') {
    throw new HttpError(409, 'La partita è già conclusa');
  }
  return game;
}

/** POST /games: avvia una nuova partita con un articolo casuale. */
export async function startGame(req, res) {
  let article;
  try {
    article = await fetchRandomArticle();
  } catch (err) {
    console.error('Errore nel recupero dell\'articolo:', err.message);
    throw new HttpError(502, 'Impossibile recuperare un articolo, riprova tra poco');
  }
  const game = await Game.create({
    userId: req.user.id,
    pageId: article.pageId,
    title: article.title,
    text: article.text,
    guessedWords: [],
    status: 'in-progress',
    startedAt: new Date(),
  });
  res.status(201).location(`/games/${game.id}`).json(toGameView(game, req.user.username));
}

/**
 * GET /games: elenco paginato di partite.
 *  - senza filtri (o status=concluded|won|abandoned): partite concluse, pubbliche;
 *  - status=in-progress: solo le partite in corso dell'utente autenticato.
 */
export async function listGames(req, res) {
  const status = req.query.status ?? 'concluded';
  if (!LIST_STATUSES.includes(status)) throw new HttpError(400, 'status non valido');
  const page = parsePositiveInt(req.query.page, 'page', 1);
  const size = parsePositiveInt(req.query.size, 'size', 10, 50);
  const player = typeof req.query.player === 'string' ? req.query.player : undefined;

  let playerFilter = player;
  if (status === 'in-progress') {
    if (!req.user) throw new HttpError(401, 'Autenticazione richiesta');
    if (player && player !== req.user.username) {
      throw new HttpError(403, 'Puoi vedere solo le tue partite in corso');
    }
    playerFilter = req.user.username;
  }

  const where = { status: status === 'concluded' ? { [Op.in]: ['won', 'abandoned'] } : status };
  const { rows, count } = await Game.findAndCountAll({
    where,
    include: {
      model: User,
      as: 'player',
      attributes: ['username'],
      required: true,
      ...(playerFilter ? { where: { username: playerFilter } } : {}),
    },
    order: status === 'in-progress' ? [['startedAt', 'DESC']] : [['endedAt', 'DESC'], ['id', 'DESC']],
    limit: size,
    offset: (page - 1) * size,
    distinct: true,
  });
  const now = new Date();
  res.json({
    items: rows.map((g) => toGameSummary(g, g.player.username, now)),
    page,
    size,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / size)),
  });
}

/** GET /games/:id: dettagli. Le partite concluse sono pubbliche, quelle in corso solo per il proprietario. */
export async function getGame(req, res) {
  const game = await findGame(parseId(req));
  if (game.status === 'in-progress') {
    if (!req.user) throw new HttpError(401, 'Autenticazione richiesta');
    if (req.user.id !== game.userId) throw new HttpError(403, 'Questa partita è in corso e appartiene a un altro giocatore');
  }
  res.json(toGameView(game, game.player.username));
}

/** POST /games/:id/word-guesses: propone una parola; se presente viene rivelata in tutte le occorrenze. */
export async function guessWord(req, res) {
  const game = await findOwnActiveGame(req);
  const raw = req.body?.word;
  if (!isValidWordGuess(raw)) {
    throw new HttpError(400, 'word: inserisci una singola parola (lettere o cifre, max 40 caratteri)');
  }
  const word = normalizeWord(raw.trim());
  if (game.guessedWords.includes(word)) {
    throw new HttpError(409, 'Hai già provato questa parola');
  }
  game.guessedWords = [...game.guessedWords, word];
  game.wordAttempts += 1;
  await game.save();
  res.status(201).json({
    word,
    occurrences: countOccurrences(game.text, word),
    game: toGameView(game, game.player.username),
  });
}

/** POST /games/:id/title-guesses: propone il titolo; se corretto la partita termina con una vittoria. */
export async function guessTitle(req, res) {
  const game = await findOwnActiveGame(req);
  const raw = req.body?.title;
  if (!isValidTitleGuess(raw)) {
    throw new HttpError(400, 'title: testo obbligatorio (max 200 caratteri)');
  }
  const correct = isTitleCorrect(game.title, raw);
  game.titleAttempts += 1;
  if (correct) {
    game.status = 'won';
    game.endedAt = new Date();
  }
  await game.save();
  res.status(201).json({ correct, game: toGameView(game, game.player.username) });
}

/** POST /games/:id/abandon: il giocatore rinuncia; il titolo viene rivelato. */
export async function abandonGame(req, res) {
  const game = await findOwnActiveGame(req);
  game.status = 'abandoned';
  game.endedAt = new Date();
  await game.save();
  res.json(toGameView(game, game.player.username));
}

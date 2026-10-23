import { Game, User } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';

const SORTS = ['average-time', 'won-games'];
const MAX_ITEMS = 50;

/**
 * GET /rankings: classifica dei giocatori in base alle partite vinte.
 *  - sort=average-time (default): tempo medio per indovinare il titolo, crescente (a parità, più vittorie);
 *  - sort=won-games: numero di partite vinte, decrescente (a parità, tempo medio inferiore).
 */
export async function getRankings(req, res) {
  const sort = req.query.sort ?? 'average-time';
  if (!SORTS.includes(sort)) throw new HttpError(400, 'sort non valido');

  const wonGames = await Game.findAll({
    where: { status: 'won' },
    attributes: ['userId', 'startedAt', 'endedAt'],
    include: { model: User, as: 'player', attributes: ['username'] },
  });

  const byPlayer = new Map();
  for (const game of wonGames) {
    const seconds = (new Date(game.endedAt) - new Date(game.startedAt)) / 1000;
    const entry = byPlayer.get(game.userId) ?? { username: game.player.username, wonGames: 0, totalSeconds: 0 };
    entry.wonGames += 1;
    entry.totalSeconds += seconds;
    byPlayer.set(game.userId, entry);
  }

  const items = [...byPlayer.values()].map((e) => ({
    username: e.username,
    wonGames: e.wonGames,
    averageTimeSeconds: Math.round(e.totalSeconds / e.wonGames),
  }));
  items.sort((a, b) =>
    sort === 'average-time'
      ? a.averageTimeSeconds - b.averageTimeSeconds || b.wonGames - a.wonGames
      : b.wonGames - a.wonGames || a.averageTimeSeconds - b.averageTimeSeconds,
  );

  res.json({ items: items.slice(0, MAX_ITEMS).map((item, i) => ({ rank: i + 1, ...item })) });
}

import { Game, GameSummary } from './models';

/** Crea un JWT fittizio (non firmato) che scade tra `secondsFromNow` secondi. */
export function fakeJwt(secondsFromNow: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ username: 'gerry', exp })}.signature`;
}

export function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    player: 'gerry',
    status: 'in-progress',
    startedAt: '2026-01-01T10:00:00.000Z',
    endedAt: null,
    elapsedSeconds: 5,
    durationSeconds: null,
    attempts: 0,
    wordAttempts: 0,
    titleAttempts: 0,
    title: null,
    guessedWords: [],
    titleWordLengths: [7],
    text: [
      { type: 'word', revealed: false, length: 2 },
      { type: 'text', text: ' ' },
      { type: 'word', revealed: false, length: 7 },
      { type: 'text', text: ', ' },
      { type: 'word', revealed: false, length: 2 },
      { type: 'text', text: '.' },
    ],
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<GameSummary> = {}): GameSummary {
  const { id, player, status, startedAt, endedAt, elapsedSeconds, durationSeconds, attempts, wordAttempts, titleAttempts, title } =
    makeGame();
  return { id, player, status, startedAt, endedAt, elapsedSeconds, durationSeconds, attempts, wordAttempts, titleAttempts, title, ...overrides };
}

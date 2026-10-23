import { APIRequestContext, expect } from '@playwright/test';

export const API = 'http://localhost:3000';
/** Titolo dell'articolo con WIKI_FIXTURE_MODE=fixed (vedi playwright.config.ts). */
export const FIXED_TITLE = 'Vesuvio';
/** Numero di parole dell'articolo di test, e occorrenze di alcune parole (vedi backend/src/services/wiki/fixtures.js). */
export const FIXED_ARTICLE = { words: 125, occurrences: { vesuvio: 3, vulcano: 2 } };

export interface TestUser {
  username: string;
  password: string;
}

export interface Player extends TestUser {
  token: string;
}

/** Username univoco (max 20 caratteri): garantisce l'isolamento tra test paralleli. */
export function uniqueUsername(prefix = 'pw'): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.slice(0, 20);
}

export function newUser(prefix?: string): TestUser {
  return { username: uniqueUsername(prefix), password: 'password-di-prova-1' };
}

export async function registerViaApi(request: APIRequestContext, user: TestUser = newUser()): Promise<TestUser> {
  const response = await request.post(`${API}/users`, { data: user });
  expect(response.status()).toBe(201);
  return user;
}

export async function loginViaApi(request: APIRequestContext, user: TestUser): Promise<string> {
  const response = await request.post(`${API}/login`, { data: user });
  expect(response.status()).toBe(200);
  return (await response.json()).token;
}

/** Registra un nuovo utente e ne ottiene il token. */
export async function createPlayer(request: APIRequestContext, prefix?: string): Promise<Player> {
  const user = await registerViaApi(request, newUser(prefix));
  return { ...user, token: await loginViaApi(request, user) };
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function startGameViaApi(request: APIRequestContext, player: Player) {
  const response = await request.post(`${API}/games`, { headers: bearer(player.token) });
  expect(response.status()).toBe(201);
  return response.json();
}

export async function winGameViaApi(request: APIRequestContext, player: Player) {
  const game = await startGameViaApi(request, player);
  const response = await request.post(`${API}/games/${game.id}/title-guesses`, {
    headers: bearer(player.token),
    data: { title: FIXED_TITLE },
  });
  expect(response.status()).toBe(201);
  return game.id as number;
}

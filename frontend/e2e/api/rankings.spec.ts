import { expect, test } from '@playwright/test';
import { API, createPlayer, winGameViaApi } from '../support/helpers';

interface Entry {
  rank: number;
  username: string;
  wonGames: number;
  averageTimeSeconds: number;
}

test.describe('REST API - classifica', () => {
  test('GET /rankings è pubblica e include i giocatori che hanno vinto', async ({ request }) => {
    const player = await createPlayer(request);
    await winGameViaApi(request, player);

    const response = await request.get(`${API}/rankings`);
    expect(response.status()).toBe(200);
    const { items } = (await response.json()) as { items: Entry[] };
    const entry = items.find((e) => e.username === player.username);
    expect(entry).toMatchObject({ wonGames: 1 });
    expect(items.map((e) => e.rank)).toEqual(items.map((_, i) => i + 1));
  });

  test('chi non ha partite vinte non compare in classifica', async ({ request }) => {
    const player = await createPlayer(request);
    const { items } = (await (await request.get(`${API}/rankings?sort=won-games`)).json()) as { items: Entry[] };
    expect(items.find((e) => e.username === player.username)).toBeUndefined();
  });

  test('sort=won-games ordina per numero di vittorie decrescente', async ({ request }) => {
    const strong = await createPlayer(request);
    const weak = await createPlayer(request);
    await winGameViaApi(request, strong);
    await winGameViaApi(request, strong);
    await winGameViaApi(request, weak);

    const { items } = (await (await request.get(`${API}/rankings?sort=won-games`)).json()) as { items: Entry[] };
    const strongIndex = items.findIndex((e) => e.username === strong.username);
    const weakIndex = items.findIndex((e) => e.username === weak.username);
    expect(items[strongIndex].wonGames).toBe(2);
    expect(strongIndex).toBeLessThan(weakIndex);
    const wins = items.map((e) => e.wonGames);
    expect(wins).toEqual([...wins].sort((a, b) => b - a));
  });

  test('sort=average-time ordina per tempo medio crescente', async ({ request }) => {
    const { items } = (await (await request.get(`${API}/rankings?sort=average-time`)).json()) as { items: Entry[] };
    const times = items.map((e) => e.averageTimeSeconds);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  test('un valore di sort non valido risponde 400', async ({ request }) => {
    expect((await request.get(`${API}/rankings?sort=casuale`)).status()).toBe(400);
  });
});

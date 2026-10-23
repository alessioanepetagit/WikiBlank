import { expect, test } from '@playwright/test';
import {
  API,
  FIXED_ARTICLE,
  FIXED_TITLE,
  bearer,
  createPlayer,
  startGameViaApi,
  winGameViaApi,
} from '../support/helpers';

test.describe('REST API - partite', () => {
  test('POST /games senza token risponde 401', async ({ request }) => {
    const response = await request.post(`${API}/games`);
    expect(response.status()).toBe(401);
  });

  test('POST /games con token non valido risponde 401', async ({ request }) => {
    const response = await request.post(`${API}/games`, { headers: bearer('token.non.valido') });
    expect(response.status()).toBe(401);
  });

  test('POST /games crea una partita e non rivela titolo né testo', async ({ request }) => {
    const player = await createPlayer(request);
    const response = await request.post(`${API}/games`, { headers: bearer(player.token) });
    expect(response.status()).toBe(201);
    const game = await response.json();
    expect(response.headers()['location']).toBe(`/games/${game.id}`);
    expect(game).toMatchObject({ player: player.username, status: 'in-progress', attempts: 0, title: null });
    expect(game.titleWordLengths).toEqual([FIXED_TITLE.length]);

    const words = game.text.filter((s: { type: string }) => s.type === 'word');
    expect(words).toHaveLength(FIXED_ARTICLE.words);
    for (const word of words) {
      expect(word.revealed).toBe(false);
      expect(word).not.toHaveProperty('text');
    }
    const raw = JSON.stringify(game).toLowerCase();
    expect(raw).not.toContain('vulcano');
    expect(raw).not.toContain('campania');
    expect(raw).not.toContain(FIXED_TITLE.toLowerCase());
  });

  test('POST /games/:id/word-guesses rivela tutte le occorrenze, ignorando maiuscole e accenti', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    const response = await request.post(`${API}/games/${game.id}/word-guesses`, {
      headers: bearer(player.token),
      data: { word: 'VESUVIO' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.word).toBe('vesuvio');
    expect(body.occurrences).toBe(FIXED_ARTICLE.occurrences.vesuvio);
    const revealed = body.game.text.filter((s: { revealed?: boolean }) => s.revealed);
    expect(revealed).toHaveLength(FIXED_ARTICLE.occurrences.vesuvio);
    expect(revealed.every((s: { text: string }) => s.text.toLowerCase() === 'vesuvio')).toBe(true);
    expect(body.game).toMatchObject({ attempts: 1, wordAttempts: 1, guessedWords: ['vesuvio'] });
  });

  test('una parola assente dal testo è comunque un tentativo', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    const response = await request.post(`${API}/games/${game.id}/word-guesses`, {
      headers: bearer(player.token),
      data: { word: 'etna' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.occurrences).toBe(0);
    expect(body.game.attempts).toBe(1);
  });

  test('ripetere una parola risponde 409 e non conta come nuovo tentativo', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    const url = `${API}/games/${game.id}/word-guesses`;
    await request.post(url, { headers: bearer(player.token), data: { word: 'vulcano' } });
    const again = await request.post(url, { headers: bearer(player.token), data: { word: 'Vulcano' } });
    expect(again.status()).toBe(409);
    const state = await (await request.get(`${API}/games/${game.id}`, { headers: bearer(player.token) })).json();
    expect(state.attempts).toBe(1);
  });

  test('i tentativi di parola non validi rispondono 400', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    for (const word of ['due parole', '', '   ', '<script>', 'a'.repeat(41), 42, null]) {
      const response = await request.post(`${API}/games/${game.id}/word-guesses`, {
        headers: bearer(player.token),
        data: { word },
      });
      expect(response.status(), JSON.stringify(word)).toBe(400);
    }
  });

  test('un titolo errato non termina la partita', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    const response = await request.post(`${API}/games/${game.id}/title-guesses`, {
      headers: bearer(player.token),
      data: { title: 'Etna' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.correct).toBe(false);
    expect(body.game).toMatchObject({ status: 'in-progress', titleAttempts: 1, attempts: 1, title: null });
  });

  test('il titolo corretto (anche con maiuscole e spazi diversi) fa vincere la partita', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    const response = await request.post(`${API}/games/${game.id}/title-guesses`, {
      headers: bearer(player.token),
      data: { title: '  vesuVIO ' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.correct).toBe(true);
    expect(body.game).toMatchObject({ status: 'won', title: FIXED_TITLE });
    expect(body.game.endedAt).not.toBeNull();
    expect(body.game.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  test('abbandonare una partita ne rivela il titolo', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    const response = await request.post(`${API}/games/${game.id}/abandon`, { headers: bearer(player.token) });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'abandoned', title: FIXED_TITLE });
  });

  test('una partita conclusa non è più modificabile (409)', async ({ request }) => {
    const player = await createPlayer(request);
    const id = await winGameViaApi(request, player);
    const headers = bearer(player.token);
    expect((await request.post(`${API}/games/${id}/word-guesses`, { headers, data: { word: 'vulcano' } })).status()).toBe(409);
    expect((await request.post(`${API}/games/${id}/title-guesses`, { headers, data: { title: 'Napoli' } })).status()).toBe(409);
    expect((await request.post(`${API}/games/${id}/abandon`, { headers })).status()).toBe(409);
  });
});

test.describe('REST API - autorizzazioni sulle partite', () => {
  test('una partita in corso è visibile solo al proprietario', async ({ request }) => {
    const owner = await createPlayer(request);
    const other = await createPlayer(request);
    const game = await startGameViaApi(request, owner);
    const url = `${API}/games/${game.id}`;

    expect((await request.get(url)).status()).toBe(401);
    expect((await request.get(url, { headers: bearer(other.token) })).status()).toBe(403);
    expect((await request.get(url, { headers: bearer(owner.token) })).status()).toBe(200);
  });

  test('un altro giocatore non può modificare la partita (403)', async ({ request }) => {
    const owner = await createPlayer(request);
    const other = await createPlayer(request);
    const game = await startGameViaApi(request, owner);
    const headers = bearer(other.token);
    expect((await request.post(`${API}/games/${game.id}/word-guesses`, { headers, data: { word: 'vulcano' } })).status()).toBe(403);
    expect((await request.post(`${API}/games/${game.id}/title-guesses`, { headers, data: { title: FIXED_TITLE } })).status()).toBe(403);
    expect((await request.post(`${API}/games/${game.id}/abandon`, { headers })).status()).toBe(403);
  });

  test('le azioni sulle partite richiedono autenticazione (401)', async ({ request }) => {
    const owner = await createPlayer(request);
    const game = await startGameViaApi(request, owner);
    expect((await request.post(`${API}/games/${game.id}/word-guesses`, { data: { word: 'vulcano' } })).status()).toBe(401);
    expect((await request.post(`${API}/games/${game.id}/title-guesses`, { data: { title: 'x' } })).status()).toBe(401);
    expect((await request.post(`${API}/games/${game.id}/abandon`)).status()).toBe(401);
  });

  test('una partita conclusa è pubblica e mostra il testo parzialmente scoperto', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    await request.post(`${API}/games/${game.id}/word-guesses`, { headers: bearer(player.token), data: { word: 'vesuvio' } });
    await request.post(`${API}/games/${game.id}/abandon`, { headers: bearer(player.token) });

    const response = await request.get(`${API}/games/${game.id}`); // senza token
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: 'abandoned', title: FIXED_TITLE, attempts: 1 });
    expect(body.text.filter((s: { revealed?: boolean }) => s.revealed)).toHaveLength(3);
  });

  test('una partita inesistente o con id non valido risponde 404', async ({ request }) => {
    expect((await request.get(`${API}/games/99999999`)).status()).toBe(404);
    expect((await request.get(`${API}/games/abc`)).status()).toBe(404);
  });
});

test.describe('REST API - elenco delle partite', () => {
  test('GET /games è pubblico, paginato e contiene solo partite concluse', async ({ request }) => {
    const player = await createPlayer(request);
    await winGameViaApi(request, player);
    const inProgress = await startGameViaApi(request, player);

    const response = await request.get(`${API}/games?size=5&page=1`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ page: 1, size: 5 });
    expect(body.items.length).toBeLessThanOrEqual(5);
    expect(body.total).toBeGreaterThanOrEqual(1);
    for (const item of body.items) {
      expect(['won', 'abandoned']).toContain(item.status);
      expect(item.title).not.toBeNull();
      expect(item).not.toHaveProperty('text'); // l'elenco non contiene il testo
    }
    expect(body.items.map((i: { id: number }) => i.id)).not.toContain(inProgress.id);
  });

  test('i filtri per giocatore ed esito funzionano', async ({ request }) => {
    const player = await createPlayer(request);
    await winGameViaApi(request, player);
    const lost = await startGameViaApi(request, player);
    await request.post(`${API}/games/${lost.id}/abandon`, { headers: bearer(player.token) });

    const all = await (await request.get(`${API}/games?player=${player.username}`)).json();
    expect(all.total).toBe(2);
    const won = await (await request.get(`${API}/games?player=${player.username}&status=won`)).json();
    expect(won.items.map((i: { status: string }) => i.status)).toEqual(['won']);
    const abandoned = await (await request.get(`${API}/games?player=${player.username}&status=abandoned`)).json();
    expect(abandoned.items.map((i: { id: number }) => i.id)).toEqual([lost.id]);
  });

  test('i parametri di paginazione e filtro non validi rispondono 400', async ({ request }) => {
    for (const query of ['page=0', 'page=abc', 'size=0', 'size=51', 'status=boh']) {
      const response = await request.get(`${API}/games?${query}`);
      expect(response.status(), query).toBe(400);
    }
  });

  test('status=in-progress richiede autenticazione e restituisce solo le proprie partite', async ({ request }) => {
    const me = await createPlayer(request);
    const other = await createPlayer(request);
    const mine = await startGameViaApi(request, me);
    await startGameViaApi(request, other);

    expect((await request.get(`${API}/games?status=in-progress`)).status()).toBe(401);
    expect(
      (await request.get(`${API}/games?status=in-progress&player=${other.username}`, { headers: bearer(me.token) })).status(),
    ).toBe(403);

    const response = await request.get(`${API}/games?status=in-progress`, { headers: bearer(me.token) });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.map((i: { id: number }) => i.id)).toEqual([mine.id]);
    expect(body.items[0].title).toBeNull();
  });
});

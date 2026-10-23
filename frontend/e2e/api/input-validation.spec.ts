import { expect, test } from '@playwright/test';
import { API, bearer, createPlayer, newUser, startGameViaApi } from '../support/helpers';
import { XSS_PAYLOADS } from '../support/security';

test.describe('REST API - input vuoti', () => {
  test('login e registrazione con stringhe vuote o di soli spazi rispondono 400', async ({ request }) => {
    const bodies = [
      { username: '', password: '' },
      { username: '   ', password: 'password-lunga-1' },
      { username: newUser().username, password: '' },
    ];
    for (const data of bodies) {
      expect((await request.post(`${API}/login`, { data })).status(), JSON.stringify(data)).toBe(400);
      expect((await request.post(`${API}/users`, { data })).status(), JSON.stringify(data)).toBe(400);
    }
  });

  test('parola e titolo vuoti o di soli spazi rispondono 400 e non contano come tentativi', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    for (const body of [{}, { word: '' }, { word: '   ' }]) {
      const response = await request.post(`${API}/games/${game.id}/word-guesses`, { headers: bearer(player.token), data: body });
      expect(response.status(), JSON.stringify(body)).toBe(400);
    }
    for (const body of [{}, { title: '' }, { title: '    ' }]) {
      const response = await request.post(`${API}/games/${game.id}/title-guesses`, { headers: bearer(player.token), data: body });
      expect(response.status(), JSON.stringify(body)).toBe(400);
    }
    const state = await (await request.get(`${API}/games/${game.id}`, { headers: bearer(player.token) })).json();
    expect(state.attempts).toBe(0);
  });
});

test.describe('REST API - payload XSS', () => {
  test('uno username con codice HTML/JS è rifiutato in registrazione e mai riflesso nelle risposte', async ({ request }) => {
    for (const payload of XSS_PAYLOADS) {
      const register = await request.post(`${API}/users`, { data: { username: payload, password: 'password-lunga-1' } });
      expect(register.status()).toBe(400);
      expect(await register.text()).not.toContain('<');

      const login = await request.post(`${API}/login`, { data: { username: payload, password: payload } });
      expect(login.status()).toBe(401);
      expect(await login.text()).not.toContain('<');
    }
  });

  test('parole con codice HTML/JS sono rifiutate (400) e non vengono salvate', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    for (const payload of XSS_PAYLOADS) {
      const response = await request.post(`${API}/games/${game.id}/word-guesses`, {
        headers: bearer(player.token),
        data: { word: payload },
      });
      expect(response.status()).toBe(400);
      expect(await response.text()).not.toContain('<');
    }
    const state = await (await request.get(`${API}/games/${game.id}`, { headers: bearer(player.token) })).json();
    expect(state.guessedWords).toEqual([]);
  });

  test('un titolo con codice HTML/JS è semplicemente un titolo errato e non viene riflesso', async ({ request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);
    for (const payload of XSS_PAYLOADS) {
      const response = await request.post(`${API}/games/${game.id}/title-guesses`, {
        headers: bearer(player.token),
        data: { title: payload },
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.correct).toBe(false);
      expect(JSON.stringify(body)).not.toContain('<script');
      expect(JSON.stringify(body)).not.toContain('onerror');
    }
  });

  test('payload XSS nei parametri di query non vengono riflessi', async ({ request }) => {
    const payload = encodeURIComponent('<script>alert("xss")</script>');

    const invalidStatus = await request.get(`${API}/games?status=${payload}`);
    expect(invalidStatus.status()).toBe(400);
    expect(await invalidStatus.text()).not.toContain('<script');

    const byPlayer = await request.get(`${API}/games?player=${payload}`);
    expect(byPlayer.status()).toBe(200);
    expect((await byPlayer.json()).items).toEqual([]);

    const invalidSort = await request.get(`${API}/rankings?sort=${payload}`);
    expect(invalidSort.status()).toBe(400);
    expect(await invalidSort.text()).not.toContain('<script');
  });

  test('le risposte sono JSON con intestazioni di sicurezza (nosniff)', async ({ request }) => {
    const response = await request.get(`${API}/games`);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });
});

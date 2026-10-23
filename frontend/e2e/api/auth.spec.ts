import { expect, test } from '@playwright/test';
import { API, newUser, registerViaApi } from '../support/helpers';

test.describe('REST API - registrazione e login', () => {
  test('POST /users crea un utente e non restituisce mai la password', async ({ request }) => {
    const user = newUser();
    const response = await request.post(`${API}/users`, { data: user });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.username).toBe(user.username);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
  });

  test('POST /users con username già in uso risponde 409', async ({ request }) => {
    const user = await registerViaApi(request);
    const response = await request.post(`${API}/users`, { data: user });
    expect(response.status()).toBe(409);
  });

  test('POST /users rifiuta dati non validi con 400', async ({ request }) => {
    const invalid = [
      { username: 'ab', password: 'password-lunga-1' },
      { username: 'nome con spazi', password: 'password-lunga-1' },
      { username: "x'; DROP TABLE Users;--", password: 'password-lunga-1' },
      { username: newUser().username, password: 'corta' },
      { username: newUser().username },
      {},
    ];
    for (const data of invalid) {
      const response = await request.post(`${API}/users`, { data });
      expect(response.status(), JSON.stringify(data)).toBe(400);
    }
  });

  test('POST /login con credenziali corrette restituisce un JWT valido', async ({ request }) => {
    const user = await registerViaApi(request);
    const response = await request.post(`${API}/login`, { data: user });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.username).toBe(user.username);
    expect(typeof body.token).toBe('string');
    expect(body.token.split('.')).toHaveLength(3); // header.payload.signature
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64url').toString());
    expect(payload.username).toBe(user.username);
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  test('POST /login con password errata risponde 401', async ({ request }) => {
    const user = await registerViaApi(request);
    const response = await request.post(`${API}/login`, { data: { ...user, password: 'password-errata-1' } });
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: 401 });
  });

  test('POST /login con utente inesistente risponde 401 con lo stesso messaggio', async ({ request }) => {
    const user = await registerViaApi(request);
    const wrongPassword = await request.post(`${API}/login`, { data: { ...user, password: 'password-errata-1' } });
    const unknownUser = await request.post(`${API}/login`, { data: newUser('inesistente') });
    expect(unknownUser.status()).toBe(401);
    expect((await unknownUser.json()).description).toBe((await wrongPassword.json()).description);
  });

  test('POST /login senza corpo risponde 400', async ({ request }) => {
    const response = await request.post(`${API}/login`, { data: {} });
    expect(response.status()).toBe(400);
  });
});

test.describe('REST API - convenzioni di base', () => {
  test('una route sconosciuta risponde 404 con un errore JSON uniforme', async ({ request }) => {
    const response = await request.get(`${API}/percorso-inesistente`);
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({ code: 404 });
  });

  test('un corpo JSON malformato risponde 400', async ({ request }) => {
    const response = await request.post(`${API}/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: '{non-e-json',
    });
    expect(response.status()).toBe(400);
  });
});

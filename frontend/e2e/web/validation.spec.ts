import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { FIXED_TITLE, newUser, registerViaApi } from '../support/helpers';
import { XSS_PAYLOADS, trackApiCalls, trackDialogs } from '../support/security';

async function startGame(page: Page) {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Nuova partita' }).click();
  await expect(page).toHaveURL(/\/games\/\d+$/);
}

test.describe('Input vuoti', () => {
  test('il login con campi vuoti mostra gli errori e non invia nulla al server', async ({ page }) => {
    const calls = trackApiCalls(page);
    await page.goto('/login');
    await page.getByRole('button', { name: 'Accedi' }).click();

    await expect(page.getByText('Inserisci il tuo username.')).toBeVisible();
    await expect(page.getByText('Inserisci la tua password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(calls).toEqual([]);
  });

  test('un username composto solo da spazi è considerato vuoto', async ({ page }) => {
    const calls = trackApiCalls(page);
    await page.goto('/login');
    await page.getByLabel('Username').fill('     ');
    await page.getByLabel('Password').fill('una-password');
    await page.getByRole('button', { name: 'Accedi' }).click();

    await expect(page.getByText('Inserisci il tuo username.')).toBeVisible();
    expect(calls).toEqual([]);
  });

  test('la registrazione con tutti i campi vuoti mostra gli errori e non invia nulla', async ({ page }) => {
    const calls = trackApiCalls(page);
    await page.goto('/register');
    await page.getByRole('button', { name: 'Crea account' }).click();

    await expect(page.getByText('Da 3 a 20 caratteri')).toBeVisible();
    await expect(page.getByText('da 8 a 72 caratteri')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
    expect(calls).toEqual([]);
  });

  test('parola e titolo vuoti (o di soli spazi) non vengono inviati e non contano come tentativi', async ({
    authedPage: page,
  }) => {
    await startGame(page);
    // Attendiamo il caricamento della partita, così la sua richiesta iniziale non viene contata
    await expect(page.getByTestId('game-status')).toHaveText('In corso');
    const calls = trackApiCalls(page);

    await page.getByRole('button', { name: 'Prova parola' }).click();
    await expect(page.getByText('Inserisci una sola parola')).toBeVisible();

    await page.getByLabel('Proponi una parola').fill('    ');
    await page.getByRole('button', { name: 'Prova parola' }).click();
    await expect(page.getByText('Inserisci una sola parola')).toBeVisible();

    await page.getByRole('button', { name: 'Prova titolo' }).click();
    await expect(page.getByText('Inserisci il titolo che pensi sia corretto')).toBeVisible();

    await page.getByLabel('Indovina il titolo').fill('     ');
    await page.getByRole('button', { name: 'Prova titolo' }).click();
    await expect(page.getByText('Inserisci il titolo che pensi sia corretto')).toBeVisible();

    await expect(page.getByTestId('game-attempts')).toHaveText('0');
    expect(calls).toEqual([]);
  });

  test('il filtro per giocatore lasciato vuoto mostra tutte le partite senza errori', async ({ page }) => {
    await page.goto('/games');
    await page.getByRole('button', { name: 'Filtra' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Partite concluse' })).toBeVisible();
  });
});

test.describe('Attacchi XSS', () => {
  test('script e markup nei campi di login vengono trattati come semplice testo', async ({ page }) => {
    const dialogs = trackDialogs(page);
    for (const payload of XSS_PAYLOADS) {
      await page.goto('/login');
      await page.getByLabel('Username').fill(payload);
      await page.getByLabel('Password').fill(payload);
      await page.getByRole('button', { name: 'Accedi' }).click();
      await expect(page.getByRole('alert')).toContainText('Credenziali non valide');
      // Il payload non deve essere stato riflesso nella pagina come HTML
      await expect(page.locator('main script, main img[src="x"], main svg[onload]')).toHaveCount(0);
    }
    expect(dialogs).toEqual([]);
  });

  test('script nello username di registrazione: bloccato dalla validazione, nessuna esecuzione', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const calls = trackApiCalls(page);
    for (const payload of XSS_PAYLOADS) {
      await page.goto('/register');
      await page.getByLabel('Username').fill(payload);
      await page.getByLabel('Password', { exact: true }).fill('password-di-prova-1');
      await page.getByLabel('Conferma password').fill('password-di-prova-1');
      await page.getByRole('button', { name: 'Crea account' }).click();
      await expect(page.getByText('Da 3 a 20 caratteri')).toBeVisible();
    }
    expect(calls).toEqual([]);
    expect(dialogs).toEqual([]);
  });

  test('script nel titolo e nelle parole proposte durante la partita non vengono eseguiti', async ({
    authedPage: page,
  }) => {
    const dialogs = trackDialogs(page);
    await startGame(page);

    for (const payload of XSS_PAYLOADS) {
      // Parola: non è una singola parola valida, quindi viene bloccata
      await page.getByLabel('Proponi una parola').fill(payload);
      await page.getByRole('button', { name: 'Prova parola' }).click();
      await expect(page.getByText('Inserisci una sola parola')).toBeVisible();

      // Titolo: il server lo valuta come titolo errato e non lo conserva né lo mostra
      await page.getByLabel('Indovina il titolo').fill(payload);
      await page.getByRole('button', { name: 'Prova titolo' }).click();
      await expect(page.getByTestId('feedback')).toContainText('Titolo errato');
    }

    await expect(page.getByTestId('game-attempts')).toHaveText(String(XSS_PAYLOADS.length));
    await expect(page.getByTestId('game-status')).toHaveText('In corso');
    await expect(page.locator('main script, main img[src="x"], main svg[onload]')).toHaveCount(0);
    await expect(page.getByTestId('guessed-words')).toHaveCount(0);
    expect(dialogs).toEqual([]);

    // La partita funziona ancora normalmente
    await page.getByLabel('Indovina il titolo').fill(FIXED_TITLE);
    await page.getByRole('button', { name: 'Prova titolo' }).click();
    await expect(page.getByTestId('game-status')).toHaveText('Vinta');
  });

  test('script nel filtro per giocatore dell\'archivio non viene eseguito né riflesso', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await page.goto('/games');
    for (const payload of XSS_PAYLOADS) {
      await page.getByLabel('Giocatore').fill(payload);
      await page.getByRole('button', { name: 'Filtra' }).click();
      await expect(page.getByTestId('empty-games')).toBeVisible();
      await expect(page.locator('main script, main img[src="x"], main svg[onload]')).toHaveCount(0);
    }
    expect(dialogs).toEqual([]);
  });

  test('payload XSS negli URL (percorso e query string) non vengono eseguiti', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await page.goto('/pagina/<script>alert("xss")</script>?x=<img src=x onerror=alert("xss")>');
    await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();

    await page.goto('/games/<script>alert("xss")</script>');
    await expect(page.getByTestId('load-error')).toContainText('Partita non trovata');

    await page.goto('/games?player=<script>alert("xss")</script>');
    await expect(page.getByRole('heading', { name: 'Partite concluse' })).toBeVisible();
    expect(dialogs).toEqual([]);
  });

  test('un utente reale con username valido viene mostrato in modo sicuro nella navbar', async ({ page, request }) => {
    const dialogs = trackDialogs(page);
    const user = await registerViaApi(request, newUser('xss'));
    await page.goto('/login');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Accedi' }).click();
    await expect(page.getByTestId('navbar-user')).toHaveText(`Ciao, ${user.username}`);
    expect(dialogs).toEqual([]);
  });
});

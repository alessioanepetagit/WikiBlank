import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { FIXED_ARTICLE, FIXED_TITLE, Player, startGameViaApi } from '../support/helpers';

async function guessWord(page: Page, word: string) {
  await page.getByLabel('Proponi una parola').fill(word);
  await page.getByRole('button', { name: 'Prova parola' }).click();
}

async function guessTitle(page: Page, title: string) {
  await page.getByLabel('Indovina il titolo').fill(title);
  await page.getByRole('button', { name: 'Prova titolo' }).click();
}

/** Avvia una partita dall'interfaccia, come farebbe l'utente. */
async function startGameFromUi(page: Page) {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Nuova partita' }).click();
  await expect(page).toHaveURL(/\/games\/\d+$/);
}

test.describe('Giocare una partita', () => {
  test('avviare una nuova partita mostra il testo oscurato, senza rivelare l\'articolo', async ({ authedPage: page }) => {
    await startGameFromUi(page);

    await expect(page.getByTestId('game-status')).toHaveText('In corso');
    await expect(page.getByTestId('game-attempts')).toHaveText('0');
    await expect(page.getByTestId('game-text').locator('.blank')).toHaveCount(FIXED_ARTICLE.words);
    await expect(page.getByTestId('game-text')).not.toContainText('vulcano');
    await expect(page.getByTestId('game-text').locator('mark')).toHaveCount(0);
    await expect(page.getByTestId('title-hint')).toBeVisible();
    await expect(page.getByTestId('game-title')).toHaveCount(0);
  });

  test('indovinare una parola la rivela in tutte le sue occorrenze', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await guessWord(page, 'VESUVIO');

    await expect(page.getByTestId('feedback')).toContainText(`compare ${FIXED_ARTICLE.occurrences.vesuvio} volte`);
    await expect(page.getByTestId('game-text').locator('mark.revealed')).toHaveCount(FIXED_ARTICLE.occurrences.vesuvio);
    await expect(page.getByTestId('game-text').locator('.blank')).toHaveCount(
      FIXED_ARTICLE.words - FIXED_ARTICLE.occurrences.vesuvio,
    );
    await expect(page.getByTestId('game-attempts')).toHaveText('1');
    await expect(page.getByTestId('guessed-words')).toContainText('vesuvio');
  });

  test('una parola assente dal testo viene segnalata e conta come tentativo', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await guessWord(page, 'etna');

    await expect(page.getByTestId('feedback')).toContainText('non è presente nel testo');
    await expect(page.getByTestId('game-attempts')).toHaveText('1');
    await expect(page.getByTestId('game-text').locator('mark')).toHaveCount(0);
  });

  test('ripetere una parola già provata viene rifiutato senza contare un nuovo tentativo', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await guessWord(page, 'vulcano');
    await expect(page.getByTestId('game-attempts')).toHaveText('1');
    await guessWord(page, 'Vulcano');

    await expect(page.getByTestId('feedback')).toContainText('Hai già provato questa parola');
    await expect(page.getByTestId('game-attempts')).toHaveText('1');
  });

  test('un input con più parole è bloccato dalla validazione lato client', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await guessWord(page, 'due parole');

    await expect(page.getByText('Inserisci una sola parola')).toBeVisible();
    await expect(page.getByTestId('game-attempts')).toHaveText('0');
  });

  test('un titolo sbagliato non termina la partita', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await guessTitle(page, 'Etna');

    await expect(page.getByTestId('feedback')).toContainText('Titolo errato');
    await expect(page.getByTestId('game-attempts')).toHaveText('1');
    await expect(page.getByTestId('game-status')).toHaveText('In corso');
  });

  test('indovinare il titolo termina la partita con una vittoria', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await guessTitle(page, FIXED_TITLE);

    await expect(page.getByTestId('game-status')).toHaveText('Vinta');
    await expect(page.getByTestId('game-title')).toHaveText(FIXED_TITLE);
    await expect(page.getByTestId('result-message')).toContainText('indovinato');
    await expect(page.getByLabel('Proponi una parola')).toHaveCount(0);
  });

  test('abbandonare la partita (con conferma) rivela il titolo', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await page.getByRole('button', { name: 'Abbandona partita' }).click();
    await page.getByRole('button', { name: 'Sì, abbandona' }).click();

    await expect(page.getByTestId('game-status')).toHaveText('Abbandonata');
    await expect(page.getByTestId('game-title')).toHaveText(FIXED_TITLE);
    await expect(page.getByLabel('Proponi una parola')).toHaveCount(0);
  });

  test('annullare la conferma non abbandona la partita', async ({ authedPage: page }) => {
    await startGameFromUi(page);
    await page.getByRole('button', { name: 'Abbandona partita' }).click();
    await page.getByRole('button', { name: 'Annulla' }).click();

    await expect(page.getByTestId('game-status')).toHaveText('In corso');
    await expect(page.getByRole('button', { name: 'Abbandona partita' })).toBeVisible();
  });
});

test.describe('Stato persistente lato server', () => {
  test('la partita si può riprendere dopo un ricaricamento e da un altro dispositivo', async ({
    authedPage: page,
    player,
    browser,
  }) => {
    await startGameFromUi(page);
    const gameUrl = page.url();
    await guessWord(page, 'vulcano');
    await expect(page.getByTestId('game-text').locator('mark.revealed')).toHaveCount(FIXED_ARTICLE.occurrences.vulcano);

    // Ricaricamento della pagina: lo stato arriva dal server
    await page.reload();
    await expect(page.getByTestId('game-text').locator('mark.revealed')).toHaveCount(FIXED_ARTICLE.occurrences.vulcano);

    // "Altro dispositivo": un contesto del browser completamente nuovo, con login tramite interfaccia
    const otherDevice = await browser.newContext();
    const otherPage = await otherDevice.newPage();
    await otherPage.goto('/login');
    await otherPage.getByLabel('Username').fill(player.username);
    await otherPage.getByLabel('Password').fill(player.password);
    await otherPage.getByRole('button', { name: 'Accedi' }).click();
    await expect(otherPage).toHaveURL(/\/play$/);
    await otherPage.getByRole('link', { name: 'Riprendi' }).click();
    await expect(otherPage).toHaveURL(gameUrl);
    await expect(otherPage.getByTestId('game-text').locator('mark.revealed')).toHaveCount(FIXED_ARTICLE.occurrences.vulcano);
    await expect(otherPage.getByTestId('guessed-words')).toContainText('vulcano');
    await otherDevice.close();
  });

  test('le partite in corso compaiono nell\'elenco dell\'area di gioco', async ({ authedPage: page, request, player }) => {
    const game = await startGameViaApi(request, player as Player);
    await page.goto('/play');
    await expect(page.getByTestId('in-progress-list')).toContainText(`Partita n. ${game.id}`);
    await page.getByRole('link', { name: 'Riprendi' }).first().click();
    await expect(page).toHaveURL(/\/games\/\d+$/);
  });
});

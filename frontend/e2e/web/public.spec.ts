import { expect, test } from '@playwright/test';
import { test as authTest } from '../support/fixtures';
import { FIXED_TITLE, createPlayer, startGameViaApi, winGameViaApi } from '../support/helpers';

test.describe('Contenuti pubblici', () => {
  test('le partite concluse sono visibili a un visitatore non registrato', async ({ page, request }) => {
    const player = await createPlayer(request);
    await winGameViaApi(request, player);

    await page.goto('/games');
    await page.getByLabel('Giocatore').fill(player.username);
    await page.getByRole('button', { name: 'Filtra' }).click();

    const row = page.getByTestId('games-table').getByRole('row').filter({ hasText: player.username });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(FIXED_TITLE);
    await expect(row).toContainText('Vinta');
  });

  test('i dettagli di una partita conclusa mostrano titolo, tentativi, tempo e testo scoperto', async ({ page, request }) => {
    const player = await createPlayer(request);
    await winGameViaApi(request, player);

    await page.goto('/games');
    await page.getByLabel('Giocatore').fill(player.username);
    await page.getByRole('button', { name: 'Filtra' }).click();
    await page.getByRole('link', { name: FIXED_TITLE }).click();

    await expect(page).toHaveURL(/\/games\/\d+$/);
    await expect(page.getByTestId('game-title')).toHaveText(FIXED_TITLE);
    await expect(page.getByTestId('game-player')).toHaveText(player.username);
    await expect(page.getByTestId('game-status')).toHaveText('Vinta');
    await expect(page.getByTestId('game-attempts')).toHaveText('1');
    await expect(page.getByTestId('game-timer')).toBeVisible();
    await expect(page.getByTestId('game-text')).toBeVisible();
  });

  test('il filtro per esito mostra solo le partite abbandonate', async ({ page, request }) => {
    const player = await createPlayer(request);
    await winGameViaApi(request, player);
    const lost = await startGameViaApi(request, player);
    await request.post(`http://localhost:3000/games/${lost.id}/abandon`, {
      headers: { Authorization: `Bearer ${player.token}` },
    });

    await page.goto('/games');
    await page.getByLabel('Giocatore').fill(player.username);
    await page.getByLabel('Esito').selectOption('abandoned');
    await page.getByRole('button', { name: 'Filtra' }).click();

    const rows = page.getByTestId('games-table').locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Abbandonata');
  });

  test('un visitatore anonimo non può aprire una partita in corso', async ({ page, request }) => {
    const player = await createPlayer(request);
    const game = await startGameViaApi(request, player);

    await page.goto(`/games/${game.id}`);
    await expect(page.getByTestId('load-error')).toContainText('accedi');
    await expect(page.getByTestId('game-text')).toHaveCount(0);
  });

  test('la classifica mostra chi ha vinto almeno una partita', async ({ page, request }) => {
    const player = await createPlayer(request);
    await winGameViaApi(request, player);

    await page.goto('/rankings');
    const row = page.getByTestId('rankings-table').getByRole('row').filter({ hasText: player.username });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('1');

    await page.getByLabel('Ordina per').selectOption('won-games');
    await expect(page.getByTestId('rankings-table').getByRole('row').filter({ hasText: player.username })).toHaveCount(1);
  });

  test('un indirizzo inesistente mostra la pagina "non trovata"', async ({ page }) => {
    await page.goto('/pagina-che-non-esiste');
    await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();
    await page.getByRole('link', { name: 'Torna alla home' }).click();
    await expect(page).toHaveURL(/\/home$/);
  });
});

test.describe('Layout responsive', () => {
  test('su desktop il menu è sempre visibile e non c\'è il pulsante hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/home');
    const navbar = page.getByRole('navigation', { name: 'Navigazione principale' });
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
    await expect(navbar.getByRole('link', { name: 'Classifica' })).toBeVisible();
  });

  test('su mobile il menu si apre e si chiude con il pulsante hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/home');
    const navbar = page.getByRole('navigation', { name: 'Navigazione principale' });
    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Classifica' })).toBeHidden();

    await menuButton.click();
    await expect(navbar.getByRole('link', { name: 'Classifica' })).toBeVisible();
    await navbar.getByRole('link', { name: 'Classifica' }).click();
    await expect(page).toHaveURL(/\/rankings$/);
    await expect(navbar.getByRole('link', { name: 'Classifica' })).toBeHidden();
  });

  test('su mobile la pagina non scorre in orizzontale', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/home');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

authTest('l\'area di gioco senza partite mostra un messaggio di stato vuoto', async ({ authedPage }) => {
  await authedPage.goto('/play');
  await expect(authedPage.getByTestId('empty-in-progress')).toBeVisible();
});

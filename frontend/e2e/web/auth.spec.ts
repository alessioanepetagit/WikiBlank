import { expect, test } from '@playwright/test';
import { newUser, registerViaApi } from '../support/helpers';
import { test as authTest } from '../support/fixtures';

test.describe('Registrazione, login e logout', () => {
  test('un visitatore anonimo vede i link per accedere e registrarsi', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveTitle(/WikiBlank/);
    const navbar = page.getByRole('navigation', { name: 'Navigazione principale' });
    await expect(navbar.getByRole('link', { name: 'Accedi' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Registrati' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Gioca', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Come si gioca' })).toBeVisible();
  });

  test('un utente può registrarsi e viene portato alla pagina di login', async ({ page }) => {
    const user = newUser();
    await page.goto('/register');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Conferma password').fill(user.password);
    await page.getByRole('button', { name: 'Crea account' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Registrazione completata')).toBeVisible();
  });

  test('la registrazione con dati non validi mostra gli errori senza inviare nulla', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill('ab');
    await page.getByLabel('Password', { exact: true }).fill('corta');
    await page.getByLabel('Conferma password').fill('diversa');
    await page.getByRole('button', { name: 'Crea account' }).click();

    await expect(page.getByText('Da 3 a 20 caratteri')).toBeVisible();
    await expect(page.getByText('da 8 a 72 caratteri')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('registrarsi con uno username già in uso mostra l\'errore del server', async ({ page, request }) => {
    const user = await registerViaApi(request);
    await page.goto('/register');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Conferma password').fill(user.password);
    await page.getByRole('button', { name: 'Crea account' }).click();

    await expect(page.getByRole('alert')).toContainText('Username già in uso');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('un utente registrato può accedere e vede il proprio nome nella navbar', async ({ page, request }) => {
    const user = await registerViaApi(request);
    await page.goto('/login');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Accedi' }).click();

    await expect(page).toHaveURL(/\/play$/);
    await expect(page.getByTestId('navbar-user')).toHaveText(`Ciao, ${user.username}`);
  });

  test('il login con password errata mostra un errore e resta sulla pagina', async ({ page, request }) => {
    const user = await registerViaApi(request);
    await page.goto('/login');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password').fill('password-sbagliata');
    await page.getByRole('button', { name: 'Accedi' }).click();

    await expect(page.getByRole('alert')).toContainText('Credenziali non valide');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('un utente anonimo che apre /play viene reindirizzato al login', async ({ page }) => {
    await page.goto('/play');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible();
  });

  authTest('un utente autenticato può effettuare il logout', async ({ authedPage, player }) => {
    await authedPage.goto('/home');
    await expect(authedPage.getByTestId('navbar-user')).toHaveText(`Ciao, ${player.username}`);
    await authedPage.getByRole('button', { name: 'Esci' }).click();

    const navbar = authedPage.getByRole('navigation', { name: 'Navigazione principale' });
    await expect(navbar.getByRole('link', { name: 'Accedi' })).toBeVisible();
    await expect(authedPage.getByTestId('navbar-user')).toHaveCount(0);
  });
});

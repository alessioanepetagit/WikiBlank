import { Page, test as base } from '@playwright/test';
import { Player, createPlayer } from './helpers';

interface Fixtures {
  /** Un giocatore già registrato (via API) e il suo token. */
  player: Player;
  /** Una pagina con la sessione del giocatore già attiva (evita di ripetere il login in ogni test). */
  authedPage: Page;
}

export const test = base.extend<Fixtures>({
  player: async ({ request }, use) => {
    await use(await createPlayer(request));
  },
  authedPage: async ({ page, player }, use) => {
    await page.addInitScript(
      ([token, username]) => {
        if (!localStorage.getItem('wikiblank.token')) {
          localStorage.setItem('wikiblank.token', token);
          localStorage.setItem('wikiblank.user', username);
        }
      },
      [player.token, player.username],
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';

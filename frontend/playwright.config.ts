import { defineConfig, devices } from '@playwright/test';

/**
 * Test End-to-End (Playwright, TypeScript).
 *  - progetto "api":      test E2E della REST API (richieste HTTP, nessun browser);
 *  - progetti "chromium" / "firefox": test E2E web (browser realistici, pagine dell'SPA).
 *
 * Gli articoli provengono dalle "fixtures" locali del backend (WIKI_SOURCE=fixtures) e, in modalità
 * "fixed", la partita ha sempre per titolo "Vesuvio": i test sono deterministici e non dipendono
 * da Wikipedia (meno flakiness). Il database è in memoria; ogni test crea i propri utenti
 * con username univoci, così i test sono isolati e possono essere eseguiti in parallelo.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/, use: { baseURL: 'http://localhost:3000' } },
    { name: 'chromium', testMatch: /web\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: /web\/.*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    {
      // Backend di test. Se la porta 3000 è già occupata (es. backend di sviluppo) fermarlo prima.
      command: 'npm start',
      cwd: '../backend',
      url: 'http://localhost:3000/games',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: '3000',
        NODE_ENV: 'test',
        JWT_SECRET: 'segreto-solo-per-i-test',
        DB_STORAGE: ':memory:',
        WIKI_SOURCE: 'fixtures',
        WIKI_FIXTURE_MODE: 'fixed',
        FRONTEND_ORIGIN: 'http://localhost:4200',
        RATE_LIMIT_ENABLED: 'false',
      },
    },
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
  ],
});

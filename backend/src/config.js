import 'dotenv/config';
import crypto from 'node:crypto';

const env = process.env;
const isProduction = env.NODE_ENV === 'production';

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('JWT_SECRET deve essere impostato in produzione');
  }
  // In sviluppo ne generiamo uno casuale: i token decadono ad ogni riavvio del server.
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET non impostato: ne uso uno casuale (i token decadono al riavvio).');
}

export const config = {
  port: Number(env.PORT) || 3000,
  jwtSecret,
  jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
  dbStorage: env.DB_STORAGE || './data/wikiblank.sqlite',
  allowedOrigins: (env.FRONTEND_ORIGIN || 'http://localhost:4200').split(',').map((o) => o.trim()),
  wiki: {
    source: env.WIKI_SOURCE || 'wikipedia',
    lang: env.WIKI_LANG || 'it',
    fixtureMode: env.WIKI_FIXTURE_MODE || 'random',
    // Vincoli per scegliere articoli adatti al gioco (né troppo brevi né troppo lunghi, titoli corti).
    // minPageBytes/maxPageBytes sono passati all'API (rnminsize/rnmaxsize: dimensione della pagina in byte)
    minPageBytes: 5000,
    maxPageBytes: 60000,
    minTextLength: 600,
    maxTextLength: 4000,
    maxTitleLength: 40,
    maxTitleWords: 5,
  },
  rateLimitEnabled: (env.RATE_LIMIT_ENABLED ?? 'true') !== 'false',
};

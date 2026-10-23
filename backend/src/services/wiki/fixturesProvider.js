import { config } from '../../config.js';
import { FIXTURE_ARTICLES } from './fixtures.js';

/** Con WIKI_FIXTURE_MODE=fixed restituisce sempre "Vesuvio" (titolo noto ai test E2E). */
export async function fetchRandomArticle() {
  const article =
    config.wiki.fixtureMode === 'fixed'
      ? FIXTURE_ARTICLES[0]
      : FIXTURE_ARTICLES[Math.floor(Math.random() * FIXTURE_ARTICLES.length)];
  return { ...article };
}

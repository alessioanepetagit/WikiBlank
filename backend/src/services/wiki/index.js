import { config } from '../../config.js';
import * as fixtures from './fixturesProvider.js';
import * as wikipedia from './wikipediaProvider.js';

/** Restituisce la voce casuale dalla sorgente configurata (WIKI_SOURCE). */
export function fetchRandomArticle() {
  return config.wiki.source === 'fixtures' ? fixtures.fetchRandomArticle() : wikipedia.fetchRandomArticle();
}

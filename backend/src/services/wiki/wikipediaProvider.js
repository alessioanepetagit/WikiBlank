import { config } from '../../config.js';
import { segment } from '../gameEngine.js';

const MAX_ATTEMPTS = 6;
const REQUEST_TIMEOUT_MS = 8000;

/** Pulisce l'estratto (residui di pronunce/date rimosse, righe vuote multiple). */
export function cleanExtract(extract) {
  return extract
    .replace(/\s*\(\s*[;,\s]*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Verifica che la voce sia adatta al gioco: lunghezza del testo e titolo non troppo lunghi. */
export function isSuitable(page) {
  const { minTextLength, maxTextLength, maxTitleLength, maxTitleWords } = config.wiki;
  if (!page?.title || !page?.extract) return false;
  const text = cleanExtract(page.extract);
  const titleWords = segment(page.title).filter((s) => s.word).length;
  return (
    text.length >= minTextLength &&
    text.length <= maxTextLength &&
    page.title.length <= maxTitleLength &&
    titleWords <= maxTitleWords &&
    !page.title.includes('(') // niente pagine di disambiguazione
  );
}

/**
 * Seleziona una voce casuale tramite la MediaWiki Action API (modulo "random", usato come generator
 * per ottenere in una sola richiesta anche il testo): rnnamespace=0 (solo voci enciclopediche),
 * rnfilterredir=nonredirects (niente redirect), rnminsize/rnmaxsize (né troppo brevi né troppo lunghe),
 * e l'introduzione in testo semplice (prop=extracts, exintro, explaintext).
 * Si ritenta finché non si trova una voce con lunghezze adatte.
 */
export async function fetchRandomArticle() {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'random',
    grnnamespace: '0',
    grnfilterredir: 'nonredirects',
    // Come suggerito dalla traccia: limitiamo la dimensione delle pagine (rnminsize / rnmaxsize)
    grnminsize: String(config.wiki.minPageBytes),
    grnmaxsize: String(config.wiki.maxPageBytes),
    grnlimit: '10',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    exlimit: 'max',
  });
  const url = `https://${config.wiki.lang}.wikipedia.org/w/api.php?${params}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WikiBlank/1.0 (progetto universitario Tecnologie Web; Univ. Napoli Federico II)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`MediaWiki API ha risposto con stato ${response.status}`);
    }
    const data = await response.json();
    const page = (data.query?.pages ?? []).find(isSuitable);
    if (page) {
      return { pageId: page.pageid, title: page.title, text: cleanExtract(page.extract) };
    }
  }
  throw new Error('Nessuna voce adatta trovata');
}

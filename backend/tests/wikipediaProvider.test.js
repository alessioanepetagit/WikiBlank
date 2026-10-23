import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cleanExtract, fetchRandomArticle, isSuitable } from '../src/services/wiki/wikipediaProvider.js';

const longText = 'Questa è una frase di prova abbastanza lunga. '.repeat(30); // ~1400 caratteri
const originalFetch = globalThis.fetch;

function mockFetch(pagesPerCall) {
  let call = 0;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    const pages = pagesPerCall[Math.min(call++, pagesPerCall.length - 1)];
    return { ok: true, status: 200, json: async () => ({ query: { pages } }) };
  };
  return urls;
}

describe('wikipediaProvider', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('isSuitable() scarta testi troppo corti, titoli lunghi e pagine di disambiguazione', () => {
    assert.equal(isSuitable({ title: 'Napoli', extract: longText }), true);
    assert.equal(isSuitable({ title: 'Napoli', extract: 'troppo corto' }), false);
    assert.equal(isSuitable({ title: 'Napoli', extract: 'x'.repeat(5000) }), false);
    assert.equal(isSuitable({ title: 'Un titolo decisamente troppo lungo per essere indovinato', extract: longText }), false);
    assert.equal(isSuitable({ title: 'Mercurio (disambigua)', extract: longText }), false);
    assert.equal(isSuitable({ title: 'Napoli' }), false);
  });

  it('cleanExtract() rimuove parentesi vuote e righe vuote multiple', () => {
    assert.equal(cleanExtract('Roma ( ; ) è bella.\n\n\n\nFine.  '), 'Roma è bella.\n\nFine.');
  });

  it('fetchRandomArticle() usa generator=random sul namespace 0 e sceglie la prima voce adatta', async () => {
    const urls = mockFetch([
      [{ pageid: 1, title: 'Corta', extract: 'poco testo' }, { pageid: 2, title: 'Roma', extract: longText }],
    ]);
    const article = await fetchRandomArticle();
    assert.equal(article.title, 'Roma');
    assert.equal(article.pageId, 2);
    assert.ok(article.text.length > 600);
    assert.match(urls[0], /generator=random/);
    assert.match(urls[0], /grnnamespace=0/);
    assert.match(urls[0], /grnfilterredir=nonredirects/);
    assert.match(urls[0], /grnminsize=\d+/);
    assert.match(urls[0], /grnmaxsize=\d+/);
  });

  it('fetchRandomArticle() ritenta finché trova una voce adatta, poi rinuncia con un errore', async () => {
    mockFetch([[{ pageid: 1, title: 'Corta', extract: 'poco' }], [{ pageid: 2, title: 'Roma', extract: longText }]]);
    assert.equal((await fetchRandomArticle()).title, 'Roma');

    mockFetch([[{ pageid: 1, title: 'Corta', extract: 'poco' }]]);
    await assert.rejects(fetchRandomArticle(), /Nessuna voce adatta/);
  });

  it('fetchRandomArticle() propaga gli errori HTTP del servizio', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(fetchRandomArticle(), /503/);
  });
});

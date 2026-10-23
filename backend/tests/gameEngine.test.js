import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMaskedText,
  countOccurrences,
  isTitleCorrect,
  isValidWordGuess,
  normalizeTitle,
  normalizeWord,
  segment,
  toGameSummary,
} from '../src/services/gameEngine.js';

describe('gameEngine', () => {
  it('segment() separa parole e separatori senza perdere caratteri', () => {
    const text = "Ciao, dell'Università 2024!";
    const segments = segment(text);
    assert.equal(segments.map((s) => s.text).join(''), text);
    assert.deepEqual(
      segments.filter((s) => s.word).map((s) => s.text),
      ['Ciao', 'dell', 'Università', '2024'],
    );
  });

  it('normalizeWord() ignora maiuscole e accenti', () => {
    assert.equal(normalizeWord('Università'), 'universita');
    assert.equal(normalizeWord('CAFFÈ'), 'caffe');
  });

  it('normalizeTitle() ignora punteggiatura e spazi multipli', () => {
    assert.equal(normalizeTitle('  Leonardo   da Vinci! '), 'leonardo da vinci');
  });

  it('isTitleCorrect() accetta varianti di maiuscole/accenti ma non titoli diversi', () => {
    assert.equal(isTitleCorrect('Leonardo da Vinci', 'leonardo DA vinci'), true);
    assert.equal(isTitleCorrect('Napoli', 'Roma'), false);
  });

  it('isValidWordGuess() accetta una sola parola', () => {
    assert.equal(isValidWordGuess('napoli'), true);
    assert.equal(isValidWordGuess(' napoli '), true);
    assert.equal(isValidWordGuess('due parole'), false);
    assert.equal(isValidWordGuess(''), false);
    assert.equal(isValidWordGuess('<script>'), false);
    assert.equal(isValidWordGuess(42), false);
  });

  it('countOccurrences() conta tutte le occorrenze, indipendentemente da maiuscole e accenti', () => {
    assert.equal(countOccurrences('Napoli, napoli e NAPOLI. Roma.', 'napoli'), 3);
    assert.equal(countOccurrences("L'Università è un'università", 'universita'), 2);
    assert.equal(countOccurrences('Roma', 'napoli'), 0);
  });

  it('buildMaskedText() NON espone le parole non indovinate e rivela tutte le occorrenze di quelle indovinate', () => {
    const masked = buildMaskedText('Napoli è bella, Napoli è antica.', ['napoli']);
    const words = masked.filter((s) => s.type === 'word');
    assert.deepEqual(words.map((w) => w.revealed), [true, false, false, true, false, false]);
    assert.equal(words[0].text, 'Napoli');
    const hidden = words.filter((w) => !w.revealed);
    for (const w of hidden) {
      assert.equal(w.text, undefined, 'il testo di una parola nascosta non deve essere inviato');
      assert.ok(w.length > 0);
    }
    assert.ok(!JSON.stringify(masked).includes('bella'));
  });

  it('toGameSummary() nasconde il titolo finché la partita è in corso e calcola la durata a partita conclusa', () => {
    const base = {
      id: 1,
      wordAttempts: 3,
      titleAttempts: 2,
      title: 'Vesuvio',
      startedAt: new Date('2026-01-01T10:00:00Z'),
    };
    const running = toGameSummary({ ...base, status: 'in-progress', endedAt: null }, 'gerry', new Date('2026-01-01T10:00:30Z'));
    assert.equal(running.title, null);
    assert.equal(running.durationSeconds, null);
    assert.equal(running.elapsedSeconds, 30);
    assert.equal(running.attempts, 5);

    const won = toGameSummary({ ...base, status: 'won', endedAt: new Date('2026-01-01T10:02:00Z') }, 'gerry');
    assert.equal(won.title, 'Vesuvio');
    assert.equal(won.durationSeconds, 120);
  });
});

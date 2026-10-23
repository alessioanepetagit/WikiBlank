/**
 * Logica pura del gioco (nessun accesso a database o rete): facilmente testabile in isolamento.
 */

const WORD_REGEX = /[\p{L}\p{N}]+/gu;

/** Spezza un testo in segmenti alternati: parole ({word: true}) e separatori ({word: false}). */
export function segment(text) {
  const segments = [];
  let last = 0;
  for (const match of text.matchAll(WORD_REGEX)) {
    if (match.index > last) {
      segments.push({ word: false, text: text.slice(last, match.index) });
    }
    segments.push({ word: true, text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ word: false, text: text.slice(last) });
  }
  return segments;
}

/** Minuscolo e senza accenti: "Università" e "universita" sono la stessa parola. */
export function normalizeWord(word) {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Normalizza un titolo ignorando maiuscole, accenti, punteggiatura e spazi multipli. */
export function normalizeTitle(title) {
  return normalizeWord(title)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Un tentativo valido è una singola parola (lettere/cifre), lunga da 1 a 40 caratteri. */
export function isValidWordGuess(value) {
  return typeof value === 'string' && /^[\p{L}\p{N}]{1,40}$/u.test(value.trim());
}

export function isValidTitleGuess(value) {
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= 200;
}

/** Quante volte la parola (già normalizzata) compare nel testo. */
export function countOccurrences(text, normalizedWord) {
  return segment(text).filter((s) => s.word && normalizeWord(s.text) === normalizedWord).length;
}

export function isTitleCorrect(title, guess) {
  return normalizeTitle(title) === normalizeTitle(guess);
}

/**
 * Costruisce il testo oscurato da inviare al client. Le parole non ancora indovinate
 * NON vengono trasmesse: solo la loro lunghezza (per disegnare il segnaposto).
 */
export function buildMaskedText(text, guessedWords) {
  const guessed = new Set(guessedWords);
  return segment(text).map((s) => {
    if (!s.word) {
      return { type: 'text', text: s.text };
    }
    if (guessed.has(normalizeWord(s.text))) {
      return { type: 'word', revealed: true, text: s.text };
    }
    return { type: 'word', revealed: false, length: s.text.length };
  });
}

export function titleWordLengths(title) {
  return segment(title)
    .filter((s) => s.word)
    .map((s) => s.text.length);
}

/** Vista completa di una partita (con testo oscurato). */
export function toGameView(game, username, now = new Date()) {
  const concluded = game.status !== 'in-progress';
  return {
    ...toGameSummary(game, username, now),
    guessedWords: game.guessedWords,
    text: buildMaskedText(game.text, game.guessedWords),
    // Le lunghezze delle parole del titolo sono un indizio utile; a partita finita si rivela il titolo.
    titleWordLengths: concluded ? null : titleWordLengths(game.title),
  };
}

/** Vista sintetica, usata negli elenchi (niente testo). */
export function toGameSummary(game, username, now = new Date()) {
  const concluded = game.status !== 'in-progress';
  const started = new Date(game.startedAt).getTime();
  const end = game.endedAt ? new Date(game.endedAt).getTime() : now.getTime();
  const elapsedSeconds = Math.max(0, Math.round((end - started) / 1000));
  return {
    id: game.id,
    player: username,
    status: game.status,
    startedAt: new Date(game.startedAt).toISOString(),
    endedAt: game.endedAt ? new Date(game.endedAt).toISOString() : null,
    elapsedSeconds,
    durationSeconds: concluded ? elapsedSeconds : null,
    attempts: game.wordAttempts + game.titleAttempts,
    wordAttempts: game.wordAttempts,
    titleAttempts: game.titleAttempts,
    title: concluded ? game.title : null,
  };
}

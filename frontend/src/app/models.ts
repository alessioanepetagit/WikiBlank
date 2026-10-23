export type GameStatus = 'in-progress' | 'won' | 'abandoned';

/** Segmento del testo di una partita: separatore, parola rivelata o parola nascosta (solo lunghezza). */
export interface TextSegment {
  type: 'text' | 'word';
  text?: string;
  revealed?: boolean;
  length?: number;
}

export interface GameSummary {
  id: number;
  player: string;
  status: GameStatus;
  startedAt: string;
  endedAt: string | null;
  elapsedSeconds: number;
  durationSeconds: number | null;
  attempts: number;
  wordAttempts: number;
  titleAttempts: number;
  title: string | null;
}

export interface Game extends GameSummary {
  guessedWords: string[];
  text: TextSegment[];
  titleWordLengths: number[] | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface WordGuessResult {
  word: string;
  occurrences: number;
  game: Game;
}

export interface TitleGuessResult {
  correct: boolean;
  game: Game;
}

export interface LoginResult {
  token: string;
  username: string;
}

export type RankingSort = 'average-time' | 'won-games';

export interface RankingEntry {
  rank: number;
  username: string;
  wonGames: number;
  averageTimeSeconds: number;
}

export interface GameListParams {
  status?: 'concluded' | 'in-progress' | 'won' | 'abandoned';
  player?: string;
  page?: number;
  size?: number;
}

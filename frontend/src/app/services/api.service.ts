import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import {
  Game,
  GameListParams,
  GameSummary,
  LoginResult,
  Page,
  RankingEntry,
  RankingSort,
  TitleGuessResult,
  WordGuessResult,
} from '../models';

/** Client della REST API di WikiBlank. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  register(username: string, password: string): Observable<{ id: number; username: string }> {
    return this.http.post<{ id: number; username: string }>(`${API_URL}/users`, { username, password });
  }

  login(username: string, password: string): Observable<LoginResult> {
    return this.http.post<LoginResult>(`${API_URL}/login`, { username, password });
  }

  startGame(): Observable<Game> {
    return this.http.post<Game>(`${API_URL}/games`, {});
  }

  getGame(id: number): Observable<Game> {
    return this.http.get<Game>(`${API_URL}/games/${id}`);
  }

  listGames(filters: GameListParams = {}): Observable<Page<GameSummary>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) params = params.set(key, String(value));
    }
    return this.http.get<Page<GameSummary>>(`${API_URL}/games`, { params });
  }

  guessWord(gameId: number, word: string): Observable<WordGuessResult> {
    return this.http.post<WordGuessResult>(`${API_URL}/games/${gameId}/word-guesses`, { word });
  }

  guessTitle(gameId: number, title: string): Observable<TitleGuessResult> {
    return this.http.post<TitleGuessResult>(`${API_URL}/games/${gameId}/title-guesses`, { title });
  }

  abandonGame(gameId: number): Observable<Game> {
    return this.http.post<Game>(`${API_URL}/games/${gameId}/abandon`, {});
  }

  getRankings(sort: RankingSort): Observable<{ items: RankingEntry[] }> {
    return this.http.get<{ items: RankingEntry[] }>(`${API_URL}/rankings`, { params: { sort } });
  }
}

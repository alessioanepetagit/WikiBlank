import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GameBoardComponent } from '../../components/game-board/game-board.component';
import { errorMessage } from '../../http-error';
import { notBlank } from '../../validators';
import { Game } from '../../models';
import { DurationPipe } from '../../pipes/duration.pipe';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

/**
 * Pagina di una partita. Il proprietario di una partita in corso può giocare;
 * chiunque può consultare i dettagli di una partita conclusa.
 */
@Component({
  selector: 'app-game-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DurationPipe, GameBoardComponent],
  template: `
    @if (loading()) {
      <p>Caricamento…</p>
    } @else if (loadError()) {
      <section class="card narrow">
        <h1>Partita non disponibile</h1>
        <p class="form-error" role="alert" data-testid="load-error">{{ loadError() }}</p>
        <a routerLink="/games" class="btn btn-outline">Vai alle partite concluse</a>
      </section>
    } @else if (game(); as g) {
      <h1>Partita n. {{ g.id }}</h1>

      <section class="summary card">
        <div class="stat">
          <span class="stat-label">Giocatore</span>
          <span class="stat-value" data-testid="game-player">{{ g.player }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Stato</span>
          <span
            class="badge"
            [class.badge-won]="g.status === 'won'"
            [class.badge-running]="g.status === 'in-progress'"
            data-testid="game-status"
            >{{ statusLabel() }}</span
          >
        </div>
        <div class="stat">
          <span class="stat-label">Tentativi</span>
          <span class="stat-value" data-testid="game-attempts">{{ g.attempts }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Tempo</span>
          <span class="stat-value" data-testid="game-timer">{{ displayedSeconds() | duration }}</span>
        </div>
        @if (g.endedAt) {
          <div class="stat">
            <span class="stat-label">Conclusa il</span>
            <span class="stat-value">{{ g.endedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
          </div>
        }
      </section>

      <section class="card">
        <h2>Titolo dell'articolo</h2>
        @if (g.title) {
          <p class="title-reveal" data-testid="game-title">{{ g.title }}</p>
        } @else {
          <p class="title-hint" data-testid="title-hint" aria-label="Lunghezza delle parole del titolo">
            @for (length of g.titleWordLengths ?? []; track $index) {
              <span class="word blank" [style.width.ch]="length"></span>
            }
          </p>
        }
      </section>

      <section class="card">
        <h2>Testo</h2>
        <app-game-board [segments]="g.text" />
      </section>

      @if (g.guessedWords.length > 0) {
        <section class="card">
          <h2>Parole già provate</h2>
          <ul class="chips" data-testid="guessed-words">
            @for (word of g.guessedWords; track word) {
              <li>{{ word }}</li>
            }
          </ul>
        </section>
      }

      @if (isPlayable()) {
        <section class="card">
          <h2>Il tuo tentativo</h2>
          @if (feedback(); as f) {
            <p class="feedback feedback-{{ f.type }}" role="status" data-testid="feedback">{{ f.text }}</p>
          }

          <form [formGroup]="wordForm" (ngSubmit)="submitWord()" novalidate class="guess-form">
            <div class="field grow">
              <label for="word">Proponi una parola</label>
              <input id="word" type="text" formControlName="word" autocomplete="off" maxlength="40" />
              @if (wordSubmitted() && wordForm.controls.word.errors) {
                <p class="field-error">Inserisci una sola parola (lettere o cifre).</p>
              }
            </div>
            <button type="submit" class="btn" [disabled]="busy()">Prova parola</button>
          </form>

          <form [formGroup]="titleForm" (ngSubmit)="submitTitle()" novalidate class="guess-form">
            <div class="field grow">
              <label for="title">Indovina il titolo</label>
              <input id="title" type="text" formControlName="title" autocomplete="off" maxlength="200" />
              @if (titleSubmitted() && titleForm.controls.title.errors) {
                <p class="field-error">Inserisci il titolo che pensi sia corretto.</p>
              }
            </div>
            <button type="submit" class="btn" [disabled]="busy()">Prova titolo</button>
          </form>

          <div class="abandon">
            @if (confirmingAbandon()) {
              <span>Vuoi davvero abbandonare la partita?</span>
              <button type="button" class="btn btn-small btn-danger" (click)="abandon()" [disabled]="busy()">
                Sì, abbandona
              </button>
              <button type="button" class="btn btn-small btn-outline" (click)="confirmingAbandon.set(false)">
                Annulla
              </button>
            } @else {
              <button type="button" class="btn btn-small btn-outline" (click)="confirmingAbandon.set(true)">
                Abbandona partita
              </button>
            }
          </div>
        </section>
      } @else {
        @if (g.status === 'won') {
          <p class="feedback feedback-success" data-testid="result-message">
            Il titolo è stato indovinato in {{ g.attempts }} tentativi!
          </p>
        } @else if (g.status === 'abandoned') {
          <p class="feedback feedback-info" data-testid="result-message">La partita è stata abbandonata.</p>
        }
        <a routerLink="/games" class="btn btn-outline">Tutte le partite concluse</a>
      }
    }
  `,
})
export class GamePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly game = signal<Game | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly feedback = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  protected readonly confirmingAbandon = signal(false);
  protected readonly wordSubmitted = signal(false);
  protected readonly titleSubmitted = signal(false);
  protected readonly displayedSeconds = signal(0);

  protected readonly isPlayable = computed(() => {
    const g = this.game();
    return g?.status === 'in-progress' && g.player === this.auth.username();
  });

  protected readonly statusLabel = computed(() => {
    switch (this.game()?.status) {
      case 'won':
        return 'Vinta';
      case 'abandoned':
        return 'Abbandonata';
      default:
        return 'In corso';
    }
  });

  protected readonly wordForm = new FormGroup({
    word: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\s*[\p{L}\p{N}]+\s*$/u), Validators.maxLength(40)],
    }),
  });

  protected readonly titleForm = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notBlank, Validators.maxLength(200)],
    }),
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.fail('Partita non trovata');
      return;
    }
    this.api.getGame(id).subscribe({
      next: (game) => {
        this.setGame(game);
        this.loading.set(false);
      },
      error: (err) => {
        const status = err?.status;
        if (status === 401) this.fail('Questa partita è in corso: accedi per vederla.');
        else if (status === 403) this.fail('Questa partita è in corso e appartiene a un altro giocatore.');
        else this.fail(errorMessage(err, 'Partita non trovata'));
      },
    });
    const timer = setInterval(() => this.tick(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  submitWord(): void {
    this.wordSubmitted.set(true);
    const g = this.game();
    if (!g || this.wordForm.invalid) return;
    const word = this.wordForm.controls.word.value.trim();

    this.busy.set(true);
    this.api.guessWord(g.id, word).subscribe({
      next: (result) => {
        this.setGame(result.game);
        this.busy.set(false);
        this.wordSubmitted.set(false);
        this.wordForm.reset();
        this.feedback.set(
          result.occurrences > 0
            ? {
                type: 'success',
                text: `La parola «${result.word}» compare ${result.occurrences} ${result.occurrences === 1 ? 'volta' : 'volte'} nel testo.`,
              }
            : { type: 'info', text: `La parola «${result.word}» non è presente nel testo.` },
        );
      },
      error: (err) => this.handleActionError(err),
    });
  }

  submitTitle(): void {
    this.titleSubmitted.set(true);
    const g = this.game();
    if (!g || this.titleForm.invalid) return;

    this.busy.set(true);
    this.api.guessTitle(g.id, this.titleForm.controls.title.value.trim()).subscribe({
      next: (result) => {
        this.setGame(result.game);
        this.busy.set(false);
        this.titleSubmitted.set(false);
        this.titleForm.reset();
        this.feedback.set(
          result.correct
            ? { type: 'success', text: 'Esatto! Hai indovinato il titolo.' }
            : { type: 'error', text: 'Titolo errato: continua a provare.' },
        );
      },
      error: (err) => this.handleActionError(err),
    });
  }

  abandon(): void {
    const g = this.game();
    if (!g) return;
    this.busy.set(true);
    this.api.abandonGame(g.id).subscribe({
      next: (game) => {
        this.setGame(game);
        this.busy.set(false);
        this.confirmingAbandon.set(false);
        this.feedback.set(null);
      },
      error: (err) => this.handleActionError(err),
    });
  }

  private setGame(game: Game): void {
    this.game.set(game);
    this.displayedSeconds.set(game.durationSeconds ?? game.elapsedSeconds);
  }

  private tick(): void {
    if (this.game()?.status === 'in-progress') {
      this.displayedSeconds.update((s) => s + 1);
    }
  }

  private handleActionError(err: unknown): void {
    this.busy.set(false);
    this.feedback.set({ type: 'error', text: errorMessage(err) });
  }

  private fail(message: string): void {
    this.loadError.set(message);
    this.loading.set(false);
  }
}

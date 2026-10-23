import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GameSummary } from '../../models';
import { errorMessage } from '../../http-error';
import { DurationPipe } from '../../pipes/duration.pipe';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

/** Area del giocatore: nuova partita e partite in corso (riprendibili da qualsiasi dispositivo). */
@Component({
  selector: 'app-play-page',
  imports: [DatePipe, RouterLink, DurationPipe],
  template: `
    <h1>Gioca</h1>
    <button type="button" class="btn" (click)="startGame()" [disabled]="starting()">
      {{ starting() ? 'Ricerca di un articolo…' : 'Nuova partita' }}
    </button>

    <h2>Le tue partite in corso</h2>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p>Caricamento…</p>
    } @else if (games().length === 0 && !error()) {
      <p data-testid="empty-in-progress">Non hai partite in corso. Avviane una nuova!</p>
    } @else {
      <ul class="game-list" data-testid="in-progress-list">
        @for (game of games(); track game.id) {
          <li class="card">
            <div>
              <strong>Partita n. {{ game.id }}</strong>
              <span class="muted">
                · iniziata il {{ game.startedAt | date: 'dd/MM/yyyy HH:mm' }} · {{ game.attempts }} tentativi ·
                {{ game.elapsedSeconds | duration }}
              </span>
            </div>
            <a [routerLink]="['/games', game.id]" class="btn btn-small">Riprendi</a>
          </li>
        }
      </ul>
    }
  `,
})
export class PlayPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly games = signal<GameSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly starting = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listGames({ status: 'in-progress', size: 50 }).subscribe({
      next: (res) => {
        this.games.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  startGame(): void {
    this.starting.set(true);
    this.api.startGame().subscribe({
      next: (game) => this.router.navigate(['/games', game.id]),
      error: (err) => {
        this.starting.set(false);
        this.notifications.error(errorMessage(err, 'Impossibile avviare la partita.'));
      },
    });
  }
}

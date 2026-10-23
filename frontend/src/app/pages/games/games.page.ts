import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GameSummary } from '../../models';
import { errorMessage } from '../../http-error';
import { DurationPipe } from '../../pipes/duration.pipe';
import { ApiService } from '../../services/api.service';

type ResultFilter = 'concluded' | 'won' | 'abandoned';

/** Archivio pubblico delle partite concluse (visibile anche agli utenti non registrati). */
@Component({
  selector: 'app-games-page',
  imports: [DatePipe, FormsModule, RouterLink, DurationPipe],
  template: `
    <h1>Partite concluse</h1>

    <div class="filters">
      <div class="field inline">
        <label for="result">Esito</label>
        <select id="result" [ngModel]="result()" (ngModelChange)="changeResult($event)">
          <option value="concluded">Tutte</option>
          <option value="won">Vinte</option>
          <option value="abandoned">Abbandonate</option>
        </select>
      </div>
      <form class="field inline" (ngSubmit)="applyPlayerFilter()">
        <label for="player">Giocatore</label>
        <input id="player" name="player" type="text" [(ngModel)]="playerInput" autocomplete="off" maxlength="20" />
        <button type="submit" class="btn btn-small btn-outline">Filtra</button>
      </form>
    </div>

    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p>Caricamento…</p>
    } @else if (games().length === 0 && !error()) {
      <p data-testid="empty-games">Non ci sono ancora partite concluse.</p>
    } @else {
      <div class="table-wrapper">
        <table data-testid="games-table">
          <thead>
            <tr>
              <th>Titolo</th>
              <th>Giocatore</th>
              <th>Esito</th>
              <th>Tentativi</th>
              <th>Tempo</th>
              <th>Conclusa il</th>
            </tr>
          </thead>
          <tbody>
            @for (game of games(); track game.id) {
              <tr>
                <td><a [routerLink]="['/games', game.id]">{{ game.title }}</a></td>
                <td>{{ game.player }}</td>
                <td>
                  <span class="badge" [class.badge-won]="game.status === 'won'">
                    {{ game.status === 'won' ? 'Vinta' : 'Abbandonata' }}
                  </span>
                </td>
                <td>{{ game.attempts }}</td>
                <td>{{ game.durationSeconds | duration }}</td>
                <td>{{ game.endedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <nav class="pagination" aria-label="Paginazione">
        <button type="button" class="btn btn-small btn-outline" [disabled]="page() <= 1" (click)="goTo(page() - 1)">
          Precedente
        </button>
        <span data-testid="page-indicator">Pagina {{ page() }} di {{ totalPages() }}</span>
        <button
          type="button"
          class="btn btn-small btn-outline"
          [disabled]="page() >= totalPages()"
          (click)="goTo(page() + 1)"
        >
          Successiva
        </button>
      </nav>
    }
  `,
})
export class GamesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly pageSize = 10;

  protected playerInput = '';
  private playerFilter = '';
  protected readonly games = signal<GameSummary[]>([]);
  protected readonly result = signal<ResultFilter>('concluded');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  changeResult(result: ResultFilter): void {
    this.result.set(result);
    this.page.set(1);
    this.load();
  }

  applyPlayerFilter(): void {
    this.playerFilter = this.playerInput.trim();
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listGames({ status: this.result(), page: this.page(), size: this.pageSize, player: this.playerFilter || undefined })
      .subscribe({
      next: (res) => {
        this.games.set(res.items);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}

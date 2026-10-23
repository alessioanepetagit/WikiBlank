import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RankingEntry, RankingSort } from '../../models';
import { errorMessage } from '../../http-error';
import { DurationPipe } from '../../pipes/duration.pipe';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-rankings-page',
  imports: [FormsModule, DurationPipe],
  template: `
    <h1>Classifica</h1>
    <p class="muted">Contano solo le partite vinte, cioè quelle in cui il titolo è stato indovinato.</p>

    <div class="field inline">
      <label for="sort">Ordina per</label>
      <select id="sort" [ngModel]="sort()" (ngModelChange)="changeSort($event)">
        <option value="average-time">Tempo medio (più veloci prima)</option>
        <option value="won-games">Partite vinte (più vittorie prima)</option>
      </select>
    </div>

    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p>Caricamento…</p>
    } @else if (items().length === 0 && !error()) {
      <p data-testid="empty-rankings">Nessun giocatore in classifica: vinci la prima partita!</p>
    } @else if (items().length > 0) {
      <div class="table-wrapper">
        <table data-testid="rankings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Giocatore</th>
              <th>Partite vinte</th>
              <th>Tempo medio</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of items(); track entry.username) {
              <tr>
                <td>{{ entry.rank }}</td>
                <td>{{ entry.username }}</td>
                <td>{{ entry.wonGames }}</td>
                <td>{{ entry.averageTimeSeconds | duration }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class RankingsPage implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly sort = signal<RankingSort>('average-time');
  protected readonly items = signal<RankingEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  changeSort(sort: RankingSort): void {
    this.sort.set(sort);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getRankings(this.sort()).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}

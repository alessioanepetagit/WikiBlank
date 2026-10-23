import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <h1>Wiki<span class="brand-blank">Blank</span></h1>
      <p class="lead">
        Un articolo enciclopedico con le parole oscurate. Indovina le parole, scopri il testo e
        riconosci il titolo prima di tutti gli altri!
      </p>
      <div class="actions">
        @if (auth.isAuthenticated()) {
          <a routerLink="/play" class="btn">Gioca ora</a>
        } @else {
          <a routerLink="/register" class="btn">Registrati per giocare</a>
          <a routerLink="/login" class="btn btn-outline">Accedi</a>
        }
        <a routerLink="/games" class="btn btn-outline">Guarda le partite concluse</a>
      </div>
    </section>

    <section class="card">
      <h2>Come si gioca</h2>
      <ol class="steps">
        <li>Avvia una nuova partita: il sistema sceglie a caso una voce enciclopedica e ne mostra il testo con tutte le parole oscurate.</li>
        <li>Proponi una parola alla volta: se compare nel testo, viene rivelata in tutte le sue occorrenze.</li>
        <li>In qualsiasi momento puoi provare a indovinare il titolo dell'articolo.</li>
        <li>La partita termina quando indovini il titolo oppure quando decidi di abbandonare.</li>
        <li>Ogni partita è salvata sul server: puoi riprenderla anche da un altro dispositivo.</li>
      </ol>
    </section>

    <section class="card">
      <h2>Classifica</h2>
      <p>
        I giocatori sono ordinati in base al tempo medio impiegato per indovinare il titolo e al numero di partite
        completate con successo. <a routerLink="/rankings">Vedi la classifica</a>.
      </p>
    </section>
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
}

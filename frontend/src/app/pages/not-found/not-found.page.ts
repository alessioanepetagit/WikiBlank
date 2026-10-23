import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="card narrow">
      <h1>Pagina non trovata</h1>
      <p>La pagina che stai cercando non esiste.</p>
      <a routerLink="/home" class="btn">Torna alla home</a>
    </section>
  `,
})
export class NotFoundPage {}

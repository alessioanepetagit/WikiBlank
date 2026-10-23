import { Component, input } from '@angular/core';
import { TextSegment } from '../../models';

/**
 * Mostra il testo di una partita: le parole rivelate in chiaro, le altre come segnaposto
 * della stessa lunghezza. Il componente non conosce (e non può mostrare) le parole nascoste.
 */
@Component({
  selector: 'app-game-board',
  template: `
    <p class="board" data-testid="game-text">
      @for (segment of segments(); track $index) {
        @if (segment.type === 'text') {
          <span>{{ segment.text }}</span>
        } @else if (segment.revealed) {
          <mark class="word revealed">{{ segment.text }}</mark>
        } @else {
          <span
            class="word blank"
            [style.width.ch]="segment.length"
            role="img"
            [attr.aria-label]="'parola nascosta di ' + segment.length + ' lettere'"
          ></span>
        }
      }
    </p>
  `,
})
export class GameBoardComponent {
  readonly segments = input.required<TextSegment[]>();
}

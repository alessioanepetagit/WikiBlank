import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Game } from '../../models';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { fakeJwt, makeGame } from '../../testing';
import { GamePage } from './game.page';

describe('GamePage', () => {
  let fixture: ComponentFixture<GamePage>;
  let el: HTMLElement;
  // Test double (spy) del servizio: i test non dipendono dalla REST API reale
  let apiSpy: {
    getGame: ReturnType<typeof vi.fn>;
    guessWord: ReturnType<typeof vi.fn>;
    guessTitle: ReturnType<typeof vi.fn>;
    abandonGame: ReturnType<typeof vi.fn>;
  };

  const setup = (game: Game | HttpErrorResponse, username: string | null = 'gerry') => {
    apiSpy.getGame.mockReturnValue(game instanceof HttpErrorResponse ? throwError(() => game) : of(game));
    if (username) TestBed.inject(AuthService).setSession(fakeJwt(3600), username);
    fixture = TestBed.createComponent(GamePage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  const type = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const submit = (formIndex: number) => {
    el.querySelectorAll('form')[formIndex].dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    apiSpy = { getGame: vi.fn(), guessWord: vi.fn(), guessTitle: vi.fn(), abandonGame: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  it('should show the masked text and the game controls to the owner of a game in progress', () => {
    setup(makeGame());
    expect(apiSpy.getGame).toHaveBeenCalledWith(1);
    expect(el.querySelectorAll('[data-testid="game-text"] .blank').length).toBe(3);
    expect(el.querySelector('[data-testid="game-status"]')?.textContent).toContain('In corso');
    expect(el.querySelector('#word')).not.toBeNull();
    expect(el.querySelector('#title')).not.toBeNull();
    expect(el.querySelector('[data-testid="game-title"]')).toBeNull();
  });

  it('should not show the controls on a concluded game, and should reveal the title', () => {
    setup(makeGame({ status: 'won', title: 'Vesuvio', titleWordLengths: null, endedAt: '2026-01-01T10:01:00.000Z' }), null);
    expect(el.querySelector('#word')).toBeNull();
    expect(el.querySelector('[data-testid="game-title"]')?.textContent).toContain('Vesuvio');
    expect(el.querySelector('[data-testid="game-status"]')?.textContent).toContain('Vinta');
  });

  it('should not show the controls to a player who is not the owner', () => {
    setup(makeGame({ player: 'someone-else' }), 'gerry');
    expect(el.querySelector('#word')).toBeNull();
  });

  it('should send the trimmed word and reveal it after a successful guess', () => {
    setup(makeGame());
    const updated = makeGame({
      attempts: 1,
      wordAttempts: 1,
      guessedWords: ['vesuvio'],
      text: [{ type: 'word', revealed: true, text: 'Vesuvio' }, { type: 'text', text: '.' }],
    });
    apiSpy.guessWord.mockReturnValue(of({ word: 'vesuvio', occurrences: 2, game: updated }));

    type('word', '  Vesuvio ');
    submit(0);

    expect(apiSpy.guessWord).toHaveBeenCalledWith(1, 'Vesuvio');
    expect(el.querySelector('mark.revealed')?.textContent).toBe('Vesuvio');
    expect(el.querySelector('[data-testid="feedback"]')?.textContent).toContain('compare 2 volte');
    expect(el.querySelector('[data-testid="game-attempts"]')?.textContent).toContain('1');
  });

  it('should tell the user when the word is not in the text', () => {
    setup(makeGame());
    apiSpy.guessWord.mockReturnValue(of({ word: 'etna', occurrences: 0, game: makeGame({ attempts: 1, wordAttempts: 1 }) }));
    type('word', 'etna');
    submit(0);
    expect(el.querySelector('[data-testid="feedback"]')?.textContent).toContain('non è presente');
  });

  it('should not call the API when more than one word is entered', () => {
    setup(makeGame());
    type('word', 'due parole');
    submit(0);
    expect(apiSpy.guessWord).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Inserisci una sola parola');
  });

  it('should report a wrong title and keep the game running', () => {
    setup(makeGame());
    apiSpy.guessTitle.mockReturnValue(of({ correct: false, game: makeGame({ attempts: 1, titleAttempts: 1 }) }));
    type('title', 'Etna');
    submit(1);
    expect(apiSpy.guessTitle).toHaveBeenCalledWith(1, 'Etna');
    expect(el.querySelector('[data-testid="feedback"]')?.textContent).toContain('Titolo errato');
    expect(el.querySelector('#word')).not.toBeNull();
  });

  it('should show the victory state after guessing the title', () => {
    setup(makeGame());
    const won = makeGame({ status: 'won', title: 'Vesuvio', attempts: 1, titleAttempts: 1, titleWordLengths: null, durationSeconds: 30 });
    apiSpy.guessTitle.mockReturnValue(of({ correct: true, game: won }));
    type('title', 'Vesuvio');
    submit(1);
    expect(el.querySelector('[data-testid="result-message"]')?.textContent).toContain('indovinato');
    expect(el.querySelector('#word')).toBeNull();
  });

  it('should explain why a game in progress of another player cannot be opened', () => {
    setup(new HttpErrorResponse({ status: 403, error: { code: 403, description: 'vietato' } }), 'gerry');
    expect(el.querySelector('[data-testid="load-error"]')?.textContent).toContain('appartiene a un altro giocatore');
  });
});

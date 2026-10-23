import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextSegment } from '../../models';
import { GameBoardComponent } from './game-board.component';

describe('GameBoardComponent', () => {
  let fixture: ComponentFixture<GameBoardComponent>;

  const render = (segments: TextSegment[]) => {
    fixture = TestBed.createComponent(GameBoardComponent);
    fixture.componentRef.setInput('segments', segments);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('should render revealed words in clear and hidden words as blanks', () => {
    const el = render([
      { type: 'word', revealed: true, text: 'Napoli' },
      { type: 'text', text: ' è ' },
      { type: 'word', revealed: false, length: 6 },
    ]);
    expect(el.querySelectorAll('mark.revealed').length).toBe(1);
    expect(el.querySelector('mark.revealed')?.textContent).toBe('Napoli');
    const blanks = el.querySelectorAll('.blank');
    expect(blanks.length).toBe(1);
    expect(blanks[0].getAttribute('aria-label')).toContain('6');
    expect((blanks[0] as HTMLElement).style.width).toBe('6ch');
  });

  it('should keep separators and never print any text for hidden words', () => {
    const el = render([
      { type: 'word', revealed: false, length: 4 },
      { type: 'text', text: ', ' },
      { type: 'word', revealed: false, length: 3 },
    ]);
    expect(el.textContent?.trim()).toBe(',');
  });
});

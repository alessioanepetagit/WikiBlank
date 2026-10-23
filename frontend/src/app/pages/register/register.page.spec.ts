import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { RegisterPage } from './register.page';

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let apiSpy: { register: ReturnType<typeof vi.fn> };
  let el: HTMLElement;

  const fill = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(() => {
    apiSpy = { register: vi.fn().mockReturnValue(of({ id: 1, username: 'gerry' })) };
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: ApiService, useValue: apiSpy }],
    });
    fixture = TestBed.createComponent(RegisterPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should not call the API when the form is invalid', () => {
    fill('username', 'ab');
    fill('password', 'short');
    fill('confirmPassword', 'different');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(apiSpy.register).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Da 3 a 20 caratteri');
    expect(el.textContent).toContain('da 8 a 72 caratteri');
  });

  it('should show an error when passwords do not match', () => {
    fill('username', 'gerry');
    fill('password', 'sussman123');
    fill('confirmPassword', 'sussman124');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(apiSpy.register).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Le password non coincidono');
  });

  it('should register a valid user', () => {
    fill('username', 'gerry');
    fill('password', 'sussman123');
    fill('confirmPassword', 'sussman123');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(apiSpy.register).toHaveBeenCalledWith('gerry', 'sussman123');
  });
});

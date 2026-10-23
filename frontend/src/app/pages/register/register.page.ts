import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../http-error';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="card narrow">
      <h1>Registrati</h1>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="username">Username</label>
          <input id="username" type="text" formControlName="username" autocomplete="username" />
          @if (submitted() && form.controls.username.errors) {
            <p class="field-error">Da 3 a 20 caratteri: lettere, cifre o underscore.</p>
          }
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" formControlName="password" autocomplete="new-password" />
          @if (submitted() && form.controls.password.errors) {
            <p class="field-error">La password deve contenere da 8 a 72 caratteri.</p>
          }
        </div>
        <div class="field">
          <label for="confirmPassword">Conferma password</label>
          <input id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" />
          @if (submitted() && form.errors?.['mismatch']) {
            <p class="field-error">Le password non coincidono.</p>
          }
        </div>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <button type="submit" class="btn" [disabled]="loading()">Crea account</button>
      </form>
      <p class="muted">Hai già un account? <a routerLink="/login">Accedi</a></p>
    </section>
  `,
})
export class RegisterPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup(
    {
      username: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9_]{3,20}$/)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;

    this.loading.set(true);
    const { username, password } = this.form.getRawValue();
    this.api.register(username.trim(), password).subscribe({
      next: () => {
        this.notifications.success('Registrazione completata! Ora puoi accedere.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Registrazione non riuscita.'));
      },
    });
  }
}

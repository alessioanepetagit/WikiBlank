import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../http-error';
import { notBlank } from '../../validators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="card narrow">
      <h1>Accedi</h1>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="username">Username</label>
          <input id="username" type="text" formControlName="username" autocomplete="username" />
          @if (submitted() && form.controls.username.errors) {
            <p class="field-error">Inserisci il tuo username.</p>
          }
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" formControlName="password" autocomplete="current-password" />
          @if (submitted() && form.controls.password.errors) {
            <p class="field-error">Inserisci la tua password.</p>
          }
        </div>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <button type="submit" class="btn" [disabled]="loading()">Accedi</button>
      </form>
      <p class="muted">Non hai un account? <a routerLink="/register">Registrati</a></p>
    </section>
  `,
})
export class LoginPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  submit(): void {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;

    this.loading.set(true);
    const { username, password } = this.form.getRawValue();
    this.api.login(username.trim(), password).subscribe({
      next: (result) => {
        this.auth.setSession(result.token, result.username);
        this.notifications.success(`Benvenuto, ${result.username}!`);
        this.router.navigate(['/play']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Accesso non riuscito.'));
      },
    });
  }
}

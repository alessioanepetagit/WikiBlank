import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="navbar">
      <div class="navbar-inner">
        <a routerLink="/home" class="brand" aria-label="WikiBlank, vai alla home">
          Wiki<span class="brand-blank">Blank</span>
        </a>
        <button
          type="button"
          class="menu-toggle"
          aria-label="Menu"
          aria-controls="main-menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMenu()"
        >
          <span class="menu-icon" aria-hidden="true">{{ menuOpen() ? '✕' : '☰' }}</span>
        </button>
        <nav id="main-menu" class="menu" [class.open]="menuOpen()" aria-label="Navigazione principale">
          <a routerLink="/home" routerLinkActive="active" (click)="closeMenu()">Home</a>
          <a routerLink="/games" routerLinkActive="active" (click)="closeMenu()">Partite</a>
          <a routerLink="/rankings" routerLinkActive="active" (click)="closeMenu()">Classifica</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/play" routerLinkActive="active" (click)="closeMenu()">Gioca</a>
            <span class="menu-user" data-testid="navbar-user">Ciao, {{ auth.username() }}</span>
            <button type="button" class="btn btn-small btn-outline" (click)="logout()">Esci</button>
          } @else {
            <a routerLink="/login" routerLinkActive="active" (click)="closeMenu()">Accedi</a>
            <a routerLink="/register" class="btn btn-small" (click)="closeMenu()">Registrati</a>
          }
        </nav>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
    this.notifications.info('Hai effettuato il logout.');
    this.router.navigate(['/home']);
  }
}

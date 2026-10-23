import { Injectable, computed, signal } from '@angular/core';

const TOKEN_KEY = 'wikiblank.token';
const USER_KEY = 'wikiblank.user';

interface AuthState {
  token: string | null;
  username: string | null;
}

/**
 * Gestisce la sessione dell'utente lato client. La REST API è stateless: l'identità è
 * dimostrata da un JWT che inviamo nell'header Authorization (vedi auth.interceptor.ts).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = signal<AuthState>(this.restore());

  readonly token = computed(() => this.state().token);
  readonly username = computed(() => this.state().username);
  readonly isAuthenticated = computed(() => this.state().token !== null);

  /** Verifica struttura e scadenza di un JWT (la firma può verificarla solo il server). */
  verifyToken(token: string | null): boolean {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /** Come isAuthenticated(), ma controlla anche la scadenza e, se serve, chiude la sessione. */
  isUserAuthenticated(): boolean {
    if (this.verifyToken(this.state().token)) return true;
    if (this.state().token !== null) this.logout();
    return false;
  }

  setSession(token: string, username: string): void {
    this.state.set({ token, username });
    this.write(TOKEN_KEY, token);
    this.write(USER_KEY, username);
  }

  logout(): void {
    this.state.set({ token: null, username: null });
    this.remove(TOKEN_KEY);
    this.remove(USER_KEY);
  }

  private restore(): AuthState {
    const token = this.read(TOKEN_KEY);
    const username = this.read(USER_KEY);
    if (token && username && this.verifyToken(token)) {
      return { token, username };
    }
    this.remove(TOKEN_KEY);
    this.remove(USER_KEY);
    return { token: null, username: null };
  }

  // localStorage può non essere disponibile (es. modalità privata restrittiva): non deve rompere l'app.
  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignorato */
    }
  }
  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignorato */
    }
  }
}

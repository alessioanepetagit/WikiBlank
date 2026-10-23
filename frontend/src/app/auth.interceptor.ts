import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './config';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

/**
 * Aggiunge l'header "Authorization: Bearer <token>" alle richieste verso la nostra API.
 * Se il server risponde 401 a una richiesta autenticata (token scaduto/invalido) chiude la sessione.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  const token = auth.token();
  if (!token || !request.url.startsWith(API_URL)) {
    return next(request);
  }
  const authorized = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
        notifications.error('Sessione scaduta: effettua nuovamente l\'accesso.');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};

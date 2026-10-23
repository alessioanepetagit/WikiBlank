import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

/** Le route protette sono accessibili solo agli utenti autenticati. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const notifications = inject(NotificationService);
  const router = inject(Router);

  if (auth.isUserAuthenticated()) {
    return true;
  }
  notifications.info('Accedi per usare questa funzione.');
  return router.parseUrl('/login');
};

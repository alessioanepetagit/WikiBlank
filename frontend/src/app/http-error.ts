import { HttpErrorResponse } from '@angular/common/http';

/** Estrae un messaggio leggibile da un errore della REST API ({ code, description }). */
export function errorMessage(error: unknown, fallback = 'Si è verificato un errore. Riprova.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Impossibile contattare il server.';
    const description = error.error?.description;
    if (typeof description === 'string' && description) return description;
  }
  return fallback;
}

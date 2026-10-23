import { Page } from '@playwright/test';

/** Payload XSS classici. Se l'applicazione li eseguisse, comparirebbe un dialog `alert`. */
export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  '"><svg onload=alert("xss")>',
];

/** Registra i dialog (alert/confirm/prompt) aperti dalla pagina: devono restare zero. */
export function trackDialogs(page: Page): string[] {
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  return dialogs;
}

/** Registra le richieste inviate alla REST API (per verificare che la validazione lato client le blocchi). */
export function trackApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http://localhost:3000') && request.method() !== 'OPTIONS') {
      calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  return calls;
}

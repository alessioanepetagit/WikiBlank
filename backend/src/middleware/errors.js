/** Errore HTTP con codice di stato: gestito dall'error handler centrale. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req, res, next) {
  next(new HttpError(404, 'Risorsa non trovata'));
}

// Formato uniforme degli errori: { code, description }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let description = err.message;
  if (err.type === 'entity.parse.failed') {
    status = 400;
    description = 'Corpo della richiesta non valido (JSON malformato)';
  }
  if (err.type === 'entity.too.large') {
    status = 413;
    description = 'Corpo della richiesta troppo grande';
  }
  if (status >= 500) {
    console.error(err);
    description = 'Errore interno del server';
  }
  res.status(status).json({ code: status, description });
}

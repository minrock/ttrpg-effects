export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
export const invalid = (message = "La entrada no es válida.") => new HttpError(422, "VALIDATION_ERROR", message);
export const missing = () => new HttpError(404, "NOT_FOUND", "No se encontró el recurso.");

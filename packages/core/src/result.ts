/** Error shape shared by every layer. `code` is stable and machine readable; `message` is for logs. */
export interface AppError {
  readonly code: string;
  readonly message: string;
}

/** Explicit success/failure value. Boundaries return this instead of throwing. */
export type Result<T, E = AppError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function appError(code: string, message: string): AppError {
  return { code, message };
}

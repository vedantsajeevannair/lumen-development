export type Result<TValue, TError = Error> =
  { readonly ok: true; readonly value: TValue } | { readonly ok: false; readonly error: TError };

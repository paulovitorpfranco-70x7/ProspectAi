export type Result<T, E> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'err'; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { kind: 'ok', value };
  },
  err<E>(error: E): Result<never, E> {
    return { kind: 'err', error };
  },
} as const;

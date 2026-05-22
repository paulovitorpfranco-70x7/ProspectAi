import { Result } from './result';

describe('Result', () => {
  it("Result.ok should return kind 'ok' with value", () => {
    const result = Result.ok('created');

    expect(result).toEqual({ kind: 'ok', value: 'created' });
  });

  it("Result.err should return kind 'err' with error", () => {
    const error = new Error('failed');
    const result = Result.err(error);

    expect(result).toEqual({ kind: 'err', error });
  });

  it("type narrowing: after checking kind === 'ok', value is accessible", () => {
    const result: Result<number, Error> = Result.ok(42);

    if (result.kind === 'ok') {
      expect(result.value).toBe(42);
      return;
    }

    throw new Error('expected ok result');
  });

  it("type narrowing: after checking kind === 'err', error is accessible", () => {
    const error = new Error('invalid');
    const result: Result<number, Error> = Result.err(error);

    if (result.kind === 'err') {
      expect(result.error).toBe(error);
      return;
    }

    throw new Error('expected err result');
  });
});

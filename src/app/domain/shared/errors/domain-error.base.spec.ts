import { DomainError } from './domain-error.base';

class TestDomainError extends DomainError {
  readonly code = 'TEST_DOMAIN_ERROR';

  constructor(message: string) {
    super(message);
  }
}

describe('DomainError', () => {
  it('creates concrete errors that inherit from DomainError and Error', () => {
    const error = new TestDomainError('Invalid domain state');

    expect(error).toBeInstanceOf(TestDomainError);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });

  it('uses the concrete subclass name instead of Error', () => {
    const error = new TestDomainError('Invalid domain state');

    expect(error.name).toBe('TestDomainError');
    expect(error.name).not.toBe('Error');
  });

  it('preserves message and code from the concrete subclass', () => {
    const error = new TestDomainError('Invalid domain state');

    expect(error.message).toBe('Invalid domain state');
    expect(error.code).toBe('TEST_DOMAIN_ERROR');
  });

  it('keeps the prototype chain after Object.setPrototypeOf', () => {
    const error = new TestDomainError('Invalid domain state');

    expect(Object.getPrototypeOf(error)).toBe(TestDomainError.prototype);
    expect(Object.getPrototypeOf(TestDomainError.prototype)).toBe(DomainError.prototype);
    expect(Object.getPrototypeOf(DomainError.prototype)).toBe(Error.prototype);
  });
});

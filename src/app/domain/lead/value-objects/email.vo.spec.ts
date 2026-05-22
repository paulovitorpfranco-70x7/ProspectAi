import { EmailInvalidError } from '@domain/lead/errors/email-invalid.error';
import { Email } from './email.vo';

describe('Email', () => {
  it('should accept "user@domain.com"', () => {
    const email = Email.create('user@domain.com');

    expect(email.getValue()).toBe('user@domain.com');
  });

  it('should normalize to lowercase', () => {
    const email = Email.create('USER@DOMAIN.COM');

    expect(email.getValue()).toBe('user@domain.com');
  });

  it('should trim whitespace', () => {
    const email = Email.create('  user@domain.com  ');

    expect(email.getValue()).toBe('user@domain.com');
  });

  it('should throw for "no-at-sign"', () => {
    expect(() => Email.create('no-at-sign')).toThrow(EmailInvalidError);
    expect(() => Email.create('no-at-sign')).toThrow('E-mail inválido: "no-at-sign".');
  });

  it('should throw for "@no-local.com"', () => {
    expect(() => Email.create('@no-local.com')).toThrow(EmailInvalidError);
    expect(() => Email.create('@no-local.com')).toThrow('E-mail inválido: "@no-local.com".');
  });

  it('should throw for "no-domain@"', () => {
    expect(() => Email.create('no-domain@')).toThrow(EmailInvalidError);
    expect(() => Email.create('no-domain@')).toThrow('E-mail inválido: "no-domain@".');
  });

  it('should throw for empty string', () => {
    expect(() => Email.create('')).toThrow(EmailInvalidError);
    expect(() => Email.create('')).toThrow('E-mail inválido: "".');
  });

  it('equals should compare by value', () => {
    const first = Email.create('USER@DOMAIN.COM');
    const same = Email.create('user@domain.com');
    const different = Email.create('other@domain.com');

    expect(first.equals(same)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});

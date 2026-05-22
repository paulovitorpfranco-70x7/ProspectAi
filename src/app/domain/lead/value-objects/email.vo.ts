import { EmailInvalidError } from '@domain/lead/errors/email-invalid.error';

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();

    if (value.length === 0 || !EMAIL_REGEX.test(value)) {
      throw new EmailInvalidError(value);
    }

    return new Email(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

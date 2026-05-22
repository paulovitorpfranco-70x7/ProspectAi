import { PhoneNumberInvalidError } from '@domain/lead/errors/phone-number-invalid.error';

export class PhoneNumber {
  private constructor(private readonly digits: string) {}

  static create(raw: string): PhoneNumber {
    if (raw.trim().length === 0) {
      throw new PhoneNumberInvalidError('EMPTY');
    }

    const digitsOnly = raw.replace(/\D/g, '');

    if (digitsOnly.length === 0) {
      throw new PhoneNumberInvalidError('NON_NUMERIC');
    }

    const normalizedDigits = PhoneNumber.stripBrazilDdi(digitsOnly);

    if (normalizedDigits.length !== 10 && normalizedDigits.length !== 11) {
      throw new PhoneNumberInvalidError('WRONG_LENGTH');
    }

    return new PhoneNumber(normalizedDigits);
  }

  getValue(): string {
    return this.digits;
  }

  getFormatted(): string {
    const ddd = this.digits.slice(0, 2);

    if (this.digits.length === 11) {
      return `(${ddd}) ${this.digits.slice(2, 7)}-${this.digits.slice(7)}`;
    }

    return `(${ddd}) ${this.digits.slice(2, 6)}-${this.digits.slice(6)}`;
  }

  toWhatsAppDigits(): string {
    return `55${this.digits}`;
  }

  equals(other: PhoneNumber): boolean {
    return this.digits === other.digits;
  }

  private static stripBrazilDdi(digits: string): string {
    if (digits.startsWith('55') && digits.length >= 12) {
      return digits.slice(2);
    }

    return digits;
  }
}

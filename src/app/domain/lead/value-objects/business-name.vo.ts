import { BusinessNameInvalidError } from '@domain/lead/errors/business-name-invalid.error';

const MIN_BUSINESS_NAME_LENGTH = 2;
const MAX_BUSINESS_NAME_LENGTH = 120;

export class BusinessName {
  private constructor(private readonly value: string) {}

  static create(raw: string): BusinessName {
    const value = raw.trim();

    if (value.length === 0) {
      throw new BusinessNameInvalidError('EMPTY');
    }

    if (value.length < MIN_BUSINESS_NAME_LENGTH) {
      throw new BusinessNameInvalidError('TOO_SHORT');
    }

    if (value.length > MAX_BUSINESS_NAME_LENGTH) {
      throw new BusinessNameInvalidError('TOO_LONG');
    }

    return new BusinessName(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: BusinessName): boolean {
    return this.value === other.value;
  }
}

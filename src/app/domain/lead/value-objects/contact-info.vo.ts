import { ContactInfoEmptyError } from '@domain/lead/errors/contact-info-empty.error';
import { Email } from './email.vo';
import { PhoneNumber } from './phone-number.vo';

export interface ContactInfoInput {
  readonly phone?: PhoneNumber | null;
  readonly email?: Email | null;
}

export class ContactInfo {
  private constructor(
    private readonly phoneValue: PhoneNumber | null,
    private readonly emailValue: Email | null,
  ) {}

  static create(input: ContactInfoInput): ContactInfo {
    const phone = input.phone ?? null;
    const email = input.email ?? null;

    if (phone === null && email === null) {
      throw new ContactInfoEmptyError();
    }

    return new ContactInfo(phone, email);
  }

  getPhone(): PhoneNumber | null {
    return this.phoneValue;
  }

  getEmail(): Email | null {
    return this.emailValue;
  }

  hasPhone(): boolean {
    return this.phoneValue !== null;
  }

  hasEmail(): boolean {
    return this.emailValue !== null;
  }

  equals(other: ContactInfo): boolean {
    const phonesAreEqual =
      this.phoneValue === null
        ? other.phoneValue === null
        : other.phoneValue !== null && this.phoneValue.equals(other.phoneValue);
    const emailsAreEqual =
      this.emailValue === null
        ? other.emailValue === null
        : other.emailValue !== null && this.emailValue.equals(other.emailValue);

    return phonesAreEqual && emailsAreEqual;
  }
}

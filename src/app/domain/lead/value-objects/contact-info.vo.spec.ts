import { ContactInfoEmptyError } from '@domain/lead/errors/contact-info-empty.error';
import { ContactInfo } from './contact-info.vo';
import { Email } from './email.vo';
import { PhoneNumber } from './phone-number.vo';

describe('ContactInfo', () => {
  it('should accept phone only', () => {
    const phone = PhoneNumber.create('(21) 99999-0001');
    const contactInfo = ContactInfo.create({ phone });

    expect(contactInfo.getPhone()).toBe(phone);
    expect(contactInfo.getEmail()).toBeNull();
  });

  it('should accept email only', () => {
    const email = Email.create('user@domain.com');
    const contactInfo = ContactInfo.create({ email });

    expect(contactInfo.getPhone()).toBeNull();
    expect(contactInfo.getEmail()).toBe(email);
  });

  it('should accept both phone and email', () => {
    const phone = PhoneNumber.create('(21) 99999-0001');
    const email = Email.create('user@domain.com');
    const contactInfo = ContactInfo.create({ phone, email });

    expect(contactInfo.getPhone()).toBe(phone);
    expect(contactInfo.getEmail()).toBe(email);
  });

  it('should throw ContactInfoEmptyError when both are null', () => {
    expect(() => ContactInfo.create({ phone: null, email: null })).toThrow(
      ContactInfoEmptyError,
    );
    expect(() => ContactInfo.create({ phone: null, email: null })).toThrow(
      'ContactInfo precisa de pelo menos telefone OU e-mail.',
    );
  });

  it('hasPhone should return true when phone present', () => {
    const contactInfo = ContactInfo.create({
      phone: PhoneNumber.create('(21) 99999-0001'),
    });

    expect(contactInfo.hasPhone()).toBe(true);
  });

  it('hasEmail should return true when email present', () => {
    const contactInfo = ContactInfo.create({
      email: Email.create('user@domain.com'),
    });

    expect(contactInfo.hasEmail()).toBe(true);
  });

  it('equals should compare phone and email values', () => {
    const first = ContactInfo.create({
      phone: PhoneNumber.create('(21) 99999-0001'),
      email: Email.create('USER@DOMAIN.COM'),
    });
    const same = ContactInfo.create({
      phone: PhoneNumber.create('+55 21 99999-0001'),
      email: Email.create('user@domain.com'),
    });
    const different = ContactInfo.create({
      phone: PhoneNumber.create('(21) 99999-0002'),
      email: Email.create('user@domain.com'),
    });

    expect(first.equals(same)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});

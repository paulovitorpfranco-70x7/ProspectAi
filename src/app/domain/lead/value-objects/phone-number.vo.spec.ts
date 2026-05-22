import { PhoneNumberInvalidError } from '@domain/lead/errors/phone-number-invalid.error';
import { PhoneNumber } from './phone-number.vo';

describe('PhoneNumber', () => {
  it('should normalize "(21) 99999-0001" to "21999990001"', () => {
    const phoneNumber = PhoneNumber.create('(21) 99999-0001');

    expect(phoneNumber.getValue()).toBe('21999990001');
  });

  it('should normalize "+55 21 99999-0001" stripping DDI', () => {
    const phoneNumber = PhoneNumber.create('+55 21 99999-0001');

    expect(phoneNumber.getValue()).toBe('21999990001');
  });

  it('should accept 10 digits (DDD + 8 digits — fixo BR)', () => {
    const phoneNumber = PhoneNumber.create('2133330001');

    expect(phoneNumber.getValue()).toBe('2133330001');
  });

  it('should accept 11 digits (DDD + 9 digits — celular BR)', () => {
    const phoneNumber = PhoneNumber.create('21999990001');

    expect(phoneNumber.getValue()).toBe('21999990001');
  });

  it('should throw EMPTY for empty string', () => {
    expect(() => PhoneNumber.create('')).toThrow(PhoneNumberInvalidError);
    expect(() => PhoneNumber.create('')).toThrow('Telefone inválido: EMPTY.');
  });

  it('should throw EMPTY for whitespace only', () => {
    expect(() => PhoneNumber.create('   ')).toThrow(PhoneNumberInvalidError);
    expect(() => PhoneNumber.create('   ')).toThrow('Telefone inválido: EMPTY.');
  });

  it('should throw WRONG_LENGTH for 9 digits', () => {
    expect(() => PhoneNumber.create('213330001')).toThrow(PhoneNumberInvalidError);
    expect(() => PhoneNumber.create('213330001')).toThrow('Telefone inválido: WRONG_LENGTH.');
  });

  it('should throw WRONG_LENGTH for 12 digits (after stripping DDI 55)', () => {
    expect(() => PhoneNumber.create('+55 21 99999-00012')).toThrow(PhoneNumberInvalidError);
    expect(() => PhoneNumber.create('+55 21 99999-00012')).toThrow(
      'Telefone inválido: WRONG_LENGTH.',
    );
  });

  it('should throw NON_NUMERIC for "abc"', () => {
    expect(() => PhoneNumber.create('abc')).toThrow(PhoneNumberInvalidError);
    expect(() => PhoneNumber.create('abc')).toThrow('Telefone inválido: NON_NUMERIC.');
  });

  it('getFormatted should produce "(21) 99999-0001" for 11 digits', () => {
    const phoneNumber = PhoneNumber.create('21999990001');

    expect(phoneNumber.getFormatted()).toBe('(21) 99999-0001');
  });

  it('getFormatted should produce "(21) 9999-0001" for 10 digits', () => {
    const phoneNumber = PhoneNumber.create('2199990001');

    expect(phoneNumber.getFormatted()).toBe('(21) 9999-0001');
  });

  it('toWhatsAppDigits should prepend 55', () => {
    const phoneNumber = PhoneNumber.create('21999990001');

    expect(phoneNumber.toWhatsAppDigits()).toBe('5521999990001');
  });

  it('toWhatsAppDigits should not double-prepend if input already had 55', () => {
    const phoneNumber = PhoneNumber.create('+55 21 99999-0001');

    expect(phoneNumber.toWhatsAppDigits()).toBe('5521999990001');
  });

  it('equals should compare by value', () => {
    const first = PhoneNumber.create('(21) 99999-0001');
    const same = PhoneNumber.create('+55 21 99999-0001');
    const different = PhoneNumber.create('(21) 99999-0002');

    expect(first.equals(same)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});

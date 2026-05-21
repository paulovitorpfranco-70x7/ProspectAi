import { BusinessNameInvalidError } from '@domain/lead/errors/business-name-invalid.error';
import { BusinessName } from './business-name.vo';

describe('BusinessName', () => {
  it('should accept name between 2 and 120 chars after trim', () => {
    const min = BusinessName.create('AB');
    const max = BusinessName.create('A'.repeat(120));

    expect(min.getValue()).toBe('AB');
    expect(max.getValue()).toBe('A'.repeat(120));
  });

  it('should throw with reason EMPTY when value is whitespace only', () => {
    expect(() => BusinessName.create('   ')).toThrow(BusinessNameInvalidError);
    expect(() => BusinessName.create('   ')).toThrow('Nome do negócio inválido: EMPTY.');
  });

  it('should throw with reason TOO_SHORT when trimmed length is 1', () => {
    expect(() => BusinessName.create(' A ')).toThrow(BusinessNameInvalidError);
    expect(() => BusinessName.create(' A ')).toThrow('Nome do negócio inválido: TOO_SHORT.');
  });

  it('should throw with reason TOO_LONG when trimmed length is 121', () => {
    const value = 'A'.repeat(121);

    expect(() => BusinessName.create(value)).toThrow(BusinessNameInvalidError);
    expect(() => BusinessName.create(value)).toThrow('Nome do negócio inválido: TOO_LONG.');
  });

  it('should preserve internal whitespace', () => {
    const businessName = BusinessName.create('Silabala   Tecnologia');

    expect(businessName.getValue()).toBe('Silabala   Tecnologia');
  });

  it('should trim leading and trailing whitespace', () => {
    const businessName = BusinessName.create('  Silabala Tecnologia  ');

    expect(businessName.getValue()).toBe('Silabala Tecnologia');
  });

  it('should return true when comparing equal business names', () => {
    const first = BusinessName.create('Silabala Tecnologia');
    const second = BusinessName.create('Silabala Tecnologia');

    expect(first.equals(second)).toBe(true);
  });

  it('should return false when comparing different business names', () => {
    const first = BusinessName.create('Silabala Tecnologia');
    const second = BusinessName.create('ProspectAI');

    expect(first.equals(second)).toBe(false);
  });
});

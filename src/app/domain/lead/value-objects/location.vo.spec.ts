import { LocationInvalidError } from '@domain/lead/errors/location-invalid.error';
import { Location } from './location.vo';

describe('Location', () => {
  it('should accept city alone (address optional)', () => {
    const location = Location.create({ city: 'Niterói' });

    expect(location.getCity()).toBe('Niterói');
    expect(location.getAddress()).toBeNull();
  });

  it('should accept city and address together', () => {
    const location = Location.create({
      city: 'Niterói',
      address: 'Rua das Flores, 123',
    });

    expect(location.getCity()).toBe('Niterói');
    expect(location.getAddress()).toBe('Rua das Flores, 123');
  });

  it('should throw LocationInvalidError on CITY when city is empty', () => {
    expect(() => Location.create({ city: '   ' })).toThrow(LocationInvalidError);
    expect(() => Location.create({ city: '   ' })).toThrow(
      'Localização inválida em CITY: cidade obrigatória.',
    );
  });

  it('should throw LocationInvalidError on CITY when city is 1 char', () => {
    expect(() => Location.create({ city: ' A ' })).toThrow(LocationInvalidError);
    expect(() => Location.create({ city: ' A ' })).toThrow(
      'Localização inválida em CITY: muito curto.',
    );
  });

  it('should throw LocationInvalidError on ADDRESS when address > 200 chars', () => {
    expect(() =>
      Location.create({
        city: 'Niterói',
        address: 'A'.repeat(201),
      }),
    ).toThrow(LocationInvalidError);
    expect(() =>
      Location.create({
        city: 'Niterói',
        address: 'A'.repeat(201),
      }),
    ).toThrow('Localização inválida em ADDRESS: muito longo.');
  });

  it('getCityNormalized should return lowercase trimmed', () => {
    const location = Location.create({ city: '  NITERÓI  ' });

    expect(location.getCityNormalized()).toBe('niterói');
  });

  it('getCityNormalized of "Niterói" equals getCityNormalized of "  NITERÓI  "', () => {
    const first = Location.create({ city: 'Niterói' });
    const second = Location.create({ city: '  NITERÓI  ' });

    expect(first.getCityNormalized()).toBe(second.getCityNormalized());
  });

  it('equals should compare by city and address values', () => {
    const first = Location.create({ city: 'Niterói', address: 'Rua A' });
    const same = Location.create({ city: 'Niterói', address: 'Rua A' });
    const different = Location.create({ city: 'Niterói', address: 'Rua B' });

    expect(first.equals(same)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});

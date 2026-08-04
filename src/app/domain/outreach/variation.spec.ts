import { pickVariation } from './variation';

describe('pickVariation', () => {
  it('should return the same option for the same seed across 100 calls', () => {
    const options = ['A', 'B', 'C'] as const;
    const seed = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    const expected = pickVariation(options, seed);

    for (let call = 0; call < 100; call += 1) {
      expect(pickVariation(options, seed)).toBe(expected);
    }
  });

  it('should distribute 1000 UUID-like seeds across three options', () => {
    const options = ['A', 'B', 'C'] as const;
    const counts = new Map<(typeof options)[number], number>(options.map((option) => [option, 0]));

    for (let index = 0; index < 1_000; index += 1) {
      const seed = `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
      const selected = pickVariation(options, seed);
      counts.set(selected, (counts.get(selected) ?? 0) + 1);
    }

    for (const option of options) {
      const percentage = (counts.get(option) ?? 0) / 1_000;
      expect(percentage).toBeGreaterThanOrEqual(0.25);
      expect(percentage).toBeLessThanOrEqual(0.42);
    }
  });

  it('should return the only available option', () => {
    expect(pickVariation(['única'] as const, 'qualquer-seed')).toBe('única');
  });

  it('should throw a clear error for an empty options array', () => {
    expect(() => pickVariation([], 'lead-id')).toThrow(
      'Não é possível selecionar uma variação de um array vazio',
    );
  });

  it('should select at least two distinct options for ten sequential seeds', () => {
    const options = ['A', 'B', 'C'] as const;
    const selected = new Set(
      Array.from({ length: 10 }, (_value, index) => pickVariation(options, `lead-${index + 1}`)),
    );

    expect(selected.size).toBeGreaterThanOrEqual(2);
  });
});

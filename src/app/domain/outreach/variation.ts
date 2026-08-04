const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

export function pickVariation<T>(options: readonly T[], seed: string): T {
  if (options.length === 0) {
    throw new Error('Não é possível selecionar uma variação de um array vazio');
  }

  if (options.length === 1) {
    return options[0] as T;
  }

  let hash = FNV_OFFSET_BASIS_32;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME_32);
  }

  const variationIndex = (hash >>> 0) % options.length;
  return options[variationIndex] as T;
}

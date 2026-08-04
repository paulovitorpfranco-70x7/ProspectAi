import {
  extractTopReviews,
  MAX_REVIEW_TEXT_LENGTH,
  MAX_TOP_REVIEWS,
  truncateWithoutBreakingWord,
} from './place-details.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

Deno.test('selects up to two highest-rated reviews with non-empty text', () => {
  const result = extractTopReviews([
    {
      rating: 4,
      text: { text: 'Atendimento rápido' },
      authorAttribution: { displayName: 'Ana' },
    },
    {
      rating: 5,
      text: { text: 'Excelente experiência' },
      authorAttribution: { displayName: 'Bruno' },
    },
    {
      rating: 3,
      text: { text: 'Bom custo-benefício' },
      authorAttribution: { displayName: 'Carla' },
    },
  ]);

  assertEquals(MAX_TOP_REVIEWS, 2);
  assertEquals(result, [
    { rating: 5, text: 'Excelente experiência', authorName: 'Bruno' },
    { rating: 4, text: 'Atendimento rápido', authorName: 'Ana' },
  ]);
});

Deno.test('returns null when reviews have no usable text', () => {
  assertEquals(
    extractTopReviews([
      { rating: 5 },
      { rating: 4, text: { text: '   ' } },
      { text: { text: 'Avaliação sem nota' } },
    ]),
    null,
  );
});

Deno.test('returns null for empty or missing reviews', () => {
  assertEquals(extractTopReviews([]), null);
  assertEquals(extractTopReviews(undefined), null);
});

Deno.test('truncates review text at 200 characters without breaking a word', () => {
  const longText = 'palavra '.repeat(30).trim();
  const expected = 'palavra '.repeat(25).trim();
  const truncated = truncateWithoutBreakingWord(longText, MAX_REVIEW_TEXT_LENGTH);

  assertEquals(truncated, expected);
  assertEquals(truncated.length <= MAX_REVIEW_TEXT_LENGTH, true);
});

Deno.test('keeps only public author name and defaults it to null', () => {
  assertEquals(extractTopReviews([{ rating: 5, text: { text: 'Ótimo' } }]), [
    { rating: 5, text: 'Ótimo', authorName: null },
  ]);
});

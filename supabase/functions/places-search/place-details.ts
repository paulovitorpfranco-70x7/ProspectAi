export interface GoogleReview {
  readonly rating?: number;
  readonly text?: { readonly text?: string };
  readonly authorAttribution?: { readonly displayName?: string };
}

export interface TopReview {
  readonly rating: number;
  readonly text: string;
  readonly authorName: string | null;
}

export interface GoogleAddressComponent {
  readonly longText?: string;
  readonly types?: readonly string[];
}

const BAIRRO_TYPE_PRIORITY = [
  'sublocality_level_1',
  'sublocality',
  'neighborhood',
  'administrative_area_level_2',
] as const;

export const MAX_TOP_REVIEWS = 2;
export const MAX_REVIEW_TEXT_LENGTH = 200;

export function extractTopReviews(
  reviews: readonly GoogleReview[] | undefined,
): readonly TopReview[] | null {
  const topReviews = (reviews ?? [])
    .flatMap((review): TopReview[] => {
      const text = review.text?.text?.trim();

      if (!text || typeof review.rating !== 'number') {
        return [];
      }

      return [
        {
          rating: review.rating,
          text: truncateWithoutBreakingWord(text, MAX_REVIEW_TEXT_LENGTH),
          authorName: review.authorAttribution?.displayName?.trim() || null,
        },
      ];
    })
    .sort((left, right) => right.rating - left.rating)
    .slice(0, MAX_TOP_REVIEWS);

  return topReviews.length > 0 ? topReviews : null;
}

export function extractBairro(
  addressComponents: readonly GoogleAddressComponent[] | undefined,
): string | null {
  for (const type of BAIRRO_TYPE_PRIORITY) {
    const component = addressComponents?.find((candidate) => candidate.types?.includes(type));
    const longText = component?.longText?.trim();

    if (longText) {
      return longText;
    }
  }

  return null;
}

export function truncateWithoutBreakingWord(text: string, maxLength: number): string {
  const normalized = text.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const prefix = normalized.slice(0, maxLength + 1);
  const lastWhitespaceIndex = prefix.search(/\s+\S*$/);

  return lastWhitespaceIndex > 0
    ? prefix.slice(0, lastWhitespaceIndex).trimEnd()
    : normalized.slice(0, maxLength);
}

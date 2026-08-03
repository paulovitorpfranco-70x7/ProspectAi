import type { WebsiteQuality } from '../value-objects/website-quality.type';

export interface CalculateLeadScoreInput {
  readonly websiteQuality: WebsiteQuality | null;
  readonly instagramHandle: string | null;
  readonly hasPhone: boolean;
  readonly rating: number | null;
  readonly reviewCount: number;
}

const MAX_LEAD_SCORE = 100;

export function calculateLeadScore(input: CalculateLeadScoreInput): number {
  let score = 0;

  if (input.websiteQuality === 'none') {
    score += 40;
  } else if (input.websiteQuality === 'weak') {
    score += 25;
  }

  if ((input.instagramHandle?.trim().length ?? 0) > 0) {
    score += 20;
  }

  if (input.hasPhone) {
    score += 15;
  }

  if (input.rating !== null && input.rating >= 4) {
    score += 15;
  }

  if (input.reviewCount >= 20) {
    score += 10;
  }

  return Math.min(score, MAX_LEAD_SCORE);
}

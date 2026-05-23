import type { LeadDto } from '../../dtos/lead.dto';

export type SearchLeadsItemStatus =
  | 'added'
  | 'skipped_duplicate'
  | 'skipped_invalid'
  | 'skipped_has_website';

export interface SearchLeadsResultItem {
  readonly itemStatus: SearchLeadsItemStatus;
  readonly placeName: string;
  readonly lead: LeadDto | null;
  readonly skipReason: string | null;
}

export interface SearchLeadsOutput {
  readonly totalFound: number;
  readonly addedCount: number;
  readonly skippedDuplicates: number;
  readonly skippedInvalid: number;
  readonly skippedWithWebsite: number;
  readonly items: readonly SearchLeadsResultItem[];
}

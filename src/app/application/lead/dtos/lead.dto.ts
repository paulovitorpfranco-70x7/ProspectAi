import type { LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';
import type { WebsiteQuality } from '@domain/lead/value-objects/website-quality.type';

export interface LeadDto {
  readonly id: string;
  readonly businessName: string;
  readonly sector: string;
  readonly city: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly phoneDigits: string | null;
  readonly email: string | null;
  readonly status: LeadStatusValue;
  readonly notes: string;
  readonly rating: number | null;
  readonly contactCount: number;
  readonly lastContactAtIso: string | null;
  readonly hasWebsite: boolean;
  readonly instagramHandle: string | null;
  readonly websiteQuality: WebsiteQuality | null;
  readonly leadScore: number;
  readonly openingHours: unknown | null;
  readonly topReviews: unknown | null;
  readonly previewUrl: string | null;
  readonly previewViews: number;
  readonly previewLastViewedAtIso: string | null;
  readonly createdAtIso: string;
}

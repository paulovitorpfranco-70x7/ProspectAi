import type { WebsiteQuality } from '@domain/lead/value-objects/website-quality.type';

export interface PlaceFinderResponseDto {
  readonly googlePlaceId?: string | null;
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly rating?: number | null;
  readonly reviewCount?: number | null;
  readonly address?: string | null;
  readonly hasWebsite?: boolean | null;
  readonly instagramHandle?: string | null;
  readonly websiteQuality?: WebsiteQuality;
}

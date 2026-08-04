import type { PlaceFinderResult } from '@domain/lead/services/place-finder.service';
import type { PlaceFinderResponseDto } from './place-finder.response.dto';

export class PlaceFinderMapper {
  static toResult(dto: PlaceFinderResponseDto): PlaceFinderResult {
    const websiteQuality = dto.websiteQuality ?? (dto.hasWebsite ? 'proper' : 'none');

    return {
      googlePlaceId: dto.googlePlaceId?.trim() || null,
      name: dto.name,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      rating: dto.rating ?? null,
      reviewCount: dto.reviewCount ?? 0,
      address: dto.address ?? null,
      hasWebsite: websiteQuality !== 'none',
      instagramHandle: dto.instagramHandle ?? null,
      websiteQuality,
    };
  }

  static toResults(dtos: readonly PlaceFinderResponseDto[]): readonly PlaceFinderResult[] {
    return dtos.map((dto) => PlaceFinderMapper.toResult(dto));
  }
}

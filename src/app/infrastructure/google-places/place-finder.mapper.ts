import type { PlaceFinderResult } from '@domain/lead/services/place-finder.service';
import type { PlaceFinderResponseDto } from './place-finder.response.dto';

export class PlaceFinderMapper {
  static toResult(dto: PlaceFinderResponseDto): PlaceFinderResult {
    const websiteQuality = dto.websiteQuality ?? (dto.hasWebsite ? 'proper' : 'none');

    return {
      name: dto.name,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      rating: dto.rating ?? null,
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

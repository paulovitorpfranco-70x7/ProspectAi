import type { UseCase } from '@application/shared/use-case.interface';
import { DomainError } from '@domain/shared';
import { Lead } from '@domain/lead/entities/lead.entity';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import type {
  PlaceFinderResult,
  PlaceFinderService,
} from '@domain/lead/services/place-finder.service';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { Email } from '@domain/lead/value-objects/email.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { LeadMapper } from '../../dtos/lead.mapper';
import type { SearchLeadsInput } from './search-leads.input.dto';
import type { SearchLeadsOutput, SearchLeadsResultItem } from './search-leads.output.dto';

export class SearchLeadsUseCase implements UseCase<SearchLeadsInput, SearchLeadsOutput> {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly placeFinder: PlaceFinderService,
  ) {}

  async execute(input: SearchLeadsInput): Promise<SearchLeadsOutput> {
    const sector = Sector.create(input.sector);
    const places = await this.placeFinder.search({ sector, city: input.city });
    const items: SearchLeadsResultItem[] = [];
    const googlePlaceIdsInBatch = new Set<string>();

    let addedCount = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    let skippedWithWebsite = 0;

    for (const place of places) {
      if (place.websiteQuality === 'proper') {
        skippedWithWebsite += 1;
        items.push(this.skipped(place, 'skipped_has_website', 'HAS_WEBSITE'));
        continue;
      }

      const parsed = this.createLeadFromPlace(place, sector, input.city);

      if (parsed.kind === 'invalid') {
        skippedInvalid += 1;
        items.push(this.skipped(place, 'skipped_invalid', parsed.reason));
        continue;
      }

      if (place.googlePlaceId !== null) {
        const isDuplicateInBatch = googlePlaceIdsInBatch.has(place.googlePlaceId);
        const alreadyExists = isDuplicateInBatch
          ? false
          : await this.leadRepository.existsByGooglePlaceId(place.googlePlaceId);

        if (isDuplicateInBatch) {
          skippedDuplicates += 1;
          items.push(this.skipped(place, 'skipped_duplicate', 'DUPLICATE'));
          continue;
        }

        if (alreadyExists) {
          await this.leadRepository.updatePlaceDetailsByGooglePlaceId(place.googlePlaceId, {
            openingHours: place.openingHours,
            topReviews: place.topReviews,
          });
          skippedDuplicates += 1;
          items.push(this.skipped(place, 'skipped_duplicate', 'DUPLICATE'));
          continue;
        }
      }

      if (
        parsed.phone !== null &&
        (await this.leadRepository.existsByPhoneAndCity(parsed.phone, input.city))
      ) {
        skippedDuplicates += 1;
        items.push(this.skipped(place, 'skipped_duplicate', 'DUPLICATE'));
        continue;
      }

      if (place.googlePlaceId !== null) {
        googlePlaceIdsInBatch.add(place.googlePlaceId);
      }

      await this.leadRepository.save(parsed.lead);
      addedCount += 1;
      items.push({
        itemStatus: 'added',
        placeName: place.name,
        lead: LeadMapper.toDto(parsed.lead),
        skipReason: null,
      });
    }

    return {
      totalFound: places.length,
      addedCount,
      skippedDuplicates,
      skippedInvalid,
      skippedWithWebsite,
      items,
    };
  }

  private createLeadFromPlace(
    place: PlaceFinderResult,
    sector: Sector,
    city: string,
  ):
    | { readonly kind: 'valid'; readonly lead: Lead; readonly phone: PhoneNumber | null }
    | { readonly kind: 'invalid'; readonly reason: string } {
    try {
      const businessName = BusinessName.create(place.name);
      const location = Location.create({ city, address: place.address });
      const phone = place.phone === null ? null : PhoneNumber.create(place.phone);
      const email = place.email === null ? null : Email.create(place.email);
      const contactInfo = ContactInfo.create({ phone, email });
      const lead = Lead.create({
        googlePlaceId: place.googlePlaceId,
        businessName,
        sector,
        location,
        contactInfo,
        rating: place.rating,
        reviewCount: place.reviewCount,
        hasWebsite: place.hasWebsite,
        instagramHandle: place.instagramHandle,
        websiteQuality: place.websiteQuality,
        openingHours: place.openingHours,
        topReviews: place.topReviews,
      });

      return { kind: 'valid', lead, phone };
    } catch (error) {
      if (error instanceof DomainError) {
        return { kind: 'invalid', reason: error.message };
      }

      throw error;
    }
  }

  private skipped(
    place: PlaceFinderResult,
    itemStatus: 'skipped_duplicate' | 'skipped_invalid' | 'skipped_has_website',
    skipReason: string,
  ): SearchLeadsResultItem {
    return {
      itemStatus,
      placeName: place.name,
      lead: null,
      skipReason,
    };
  }
}

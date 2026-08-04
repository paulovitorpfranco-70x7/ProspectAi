import type { Lead } from '@domain/lead/entities/lead.entity';
import type { LeadDto } from './lead.dto';

export class LeadMapper {
  static toDto(lead: Lead): LeadDto {
    const phone = lead.contactInfo.getPhone();
    const email = lead.contactInfo.getEmail();

    return {
      id: lead.id.getValue(),
      businessName: lead.businessName.getValue(),
      sector: lead.sector.getValue(),
      city: lead.location.getCity(),
      address: lead.location.getAddress(),
      phone: phone?.getFormatted() ?? null,
      phoneDigits: phone?.getValue() ?? null,
      email: email?.getValue() ?? null,
      status: lead.status.getValue(),
      notes: lead.notes,
      rating: lead.rating,
      reviewCount: lead.reviewCount,
      bairro: lead.bairro,
      contactCount: lead.contactCount,
      lastContactAtIso: lead.lastContactAt?.toISOString() ?? null,
      hasWebsite: lead.hasWebsite,
      instagramHandle: lead.instagramHandle,
      websiteQuality: lead.websiteQuality,
      leadScore: lead.leadScore,
      openingHours: lead.openingHours,
      topReviews: lead.topReviews,
      previewUrl: lead.previewUrl,
      previewViews: lead.previewViews,
      previewLastViewedAtIso: lead.previewLastViewedAt?.toISOString() ?? null,
      createdAtIso: lead.createdAt.toISOString(),
    };
  }
}

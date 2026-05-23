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
      contactCount: lead.contactCount,
      lastContactAtIso: lead.lastContactAt?.toISOString() ?? null,
      hasWebsite: lead.hasWebsite,
      createdAtIso: lead.createdAt.toISOString(),
    };
  }
}

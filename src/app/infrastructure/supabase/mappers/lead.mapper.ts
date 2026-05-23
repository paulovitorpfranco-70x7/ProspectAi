import { Lead, type LeadSnapshot } from '@domain/lead/entities/lead.entity';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { Email } from '@domain/lead/value-objects/email.vo';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import type { Database } from '../types/database.types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

export type LeadPersistenceRow = Omit<
  LeadRow,
  'city_normalized' | 'updated_at' | 'created_by' | 'updated_by'
>;

export class SupabaseLeadMapper {
  static toDomain(row: LeadRow): Lead {
    const phone = row.phone_digits ? PhoneNumber.create(row.phone_digits) : null;
    const email = row.email ? Email.create(row.email) : null;
    const snapshot: LeadSnapshot = {
      id: LeadId.fromString(row.id),
      businessName: BusinessName.create(row.business_name),
      sector: Sector.create(row.sector),
      location: Location.create({ city: row.city, address: row.address }),
      contactInfo: ContactInfo.create({ phone, email }),
      status: LeadStatus.create(row.status),
      notes: row.notes,
      rating: row.rating ? Number(row.rating) : null,
      contactCount: row.contact_count,
      lastContactAt: row.last_contact_at ? new Date(row.last_contact_at) : null,
      hasWebsite: row.has_website,
      createdAt: new Date(row.created_at),
    };

    return Lead.reconstitute(snapshot);
  }

  static toRow(lead: Lead): LeadPersistenceRow {
    return {
      id: lead.id.getValue(),
      business_name: lead.businessName.getValue(),
      sector: lead.sector.getValue(),
      city: lead.location.getCity(),
      address: lead.location.getAddress(),
      phone_digits: lead.contactInfo.getPhone()?.getValue() ?? null,
      email: lead.contactInfo.getEmail()?.getValue() ?? null,
      status: lead.status.getValue() as Database['public']['Enums']['lead_status'],
      notes: lead.notes,
      rating: lead.rating,
      contact_count: lead.contactCount,
      last_contact_at: lead.lastContactAt?.toISOString() ?? null,
      has_website: lead.hasWebsite,
      created_at: lead.createdAt.toISOString(),
    };
  }
}

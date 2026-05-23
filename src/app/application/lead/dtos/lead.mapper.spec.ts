import { Lead, type LeadSnapshot } from '@domain/lead/entities/lead.entity';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { Email } from '@domain/lead/value-objects/email.vo';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { LeadMapper } from './lead.mapper';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';
const CREATED_AT = new Date('2026-05-18T12:00:00.000Z');
const LAST_CONTACT_AT = new Date('2026-05-19T13:30:00.000Z');

function makeSnapshot(overrides: Partial<LeadSnapshot> = {}): LeadSnapshot {
  const phone = PhoneNumber.create('(21) 99999-0001');
  const email = Email.create('Contato@Acme.com');

  return {
    id: LeadId.fromString(LEAD_ID),
    businessName: BusinessName.create('Acme Clinic'),
    sector: Sector.create('Clínicas & Consultórios'),
    location: Location.create({ city: 'Niterói', address: 'Rua A, 123' }),
    contactInfo: ContactInfo.create({ phone, email }),
    status: LeadStatus.proposta(),
    notes: 'Lead interessado',
    rating: 4.5,
    contactCount: 3,
    lastContactAt: LAST_CONTACT_AT,
    hasWebsite: true,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute(makeSnapshot(overrides));
}

describe('LeadMapper', () => {
  it('should map Lead entity to LeadDto with all fields', () => {
    const lead = makeLead();

    expect(LeadMapper.toDto(lead)).toEqual({
      id: LEAD_ID,
      businessName: 'Acme Clinic',
      sector: 'Clínicas & Consultórios',
      city: 'Niterói',
      address: 'Rua A, 123',
      phone: '(21) 99999-0001',
      phoneDigits: '21999990001',
      email: 'contato@acme.com',
      status: 'proposta',
      notes: 'Lead interessado',
      rating: 4.5,
      contactCount: 3,
      lastContactAtIso: '2026-05-19T13:30:00.000Z',
      hasWebsite: true,
      createdAtIso: '2026-05-18T12:00:00.000Z',
    });
  });

  it('should map phone via getFormatted', () => {
    const dto = LeadMapper.toDto(makeLead());

    expect(dto.phone).toBe('(21) 99999-0001');
  });

  it('should map phoneDigits via getValue', () => {
    const dto = LeadMapper.toDto(makeLead());

    expect(dto.phoneDigits).toBe('21999990001');
  });

  it('should map null phone to null in DTO', () => {
    const contactInfo = ContactInfo.create({
      email: Email.create('contato@acme.com'),
    });
    const dto = LeadMapper.toDto(makeLead({ contactInfo }));

    expect(dto.phone).toBeNull();
    expect(dto.phoneDigits).toBeNull();
  });

  it('should map createdAt Date to ISO string', () => {
    const dto = LeadMapper.toDto(makeLead({ createdAt: CREATED_AT }));

    expect(dto.createdAtIso).toBe('2026-05-18T12:00:00.000Z');
  });

  it('should map null lastContactAt to null in DTO', () => {
    const dto = LeadMapper.toDto(makeLead({ lastContactAt: null }));

    expect(dto.lastContactAtIso).toBeNull();
  });
});

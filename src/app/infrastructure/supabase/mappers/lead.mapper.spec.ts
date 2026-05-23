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
import { SupabaseLeadMapper, type LeadPersistenceRow } from './lead.mapper';

type LeadRow = Database['public']['Tables']['leads']['Row'];

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';
const CREATED_AT_ISO = '2026-05-18T12:00:00.000Z';
const UPDATED_AT_ISO = '2026-05-19T12:00:00.000Z';
const LAST_CONTACT_AT_ISO = '2026-05-20T15:30:00.000Z';

function makeRow(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: LEAD_ID,
    business_name: 'Acme Clinic',
    sector: 'Clínicas & Consultórios',
    city: 'Niterói',
    city_normalized: 'niterói',
    address: 'Rua A, 123',
    phone_digits: '21999990001',
    email: 'contato@acme.com',
    status: 'contatado',
    notes: 'Lead interessado',
    rating: 4.5,
    contact_count: 2,
    last_contact_at: LAST_CONTACT_AT_ISO,
    has_website: false,
    created_at: CREATED_AT_ISO,
    updated_at: UPDATED_AT_ISO,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<LeadSnapshot> = {}): LeadSnapshot {
  return {
    id: LeadId.fromString(LEAD_ID),
    businessName: BusinessName.create('Acme Clinic'),
    sector: Sector.create('Clínicas & Consultórios'),
    location: Location.create({ city: 'Niterói', address: 'Rua A, 123' }),
    contactInfo: ContactInfo.create({
      phone: PhoneNumber.create('(21) 99999-0001'),
      email: Email.create('contato@acme.com'),
    }),
    status: LeadStatus.contatado(),
    notes: 'Lead interessado',
    rating: 4.5,
    contactCount: 2,
    lastContactAt: new Date(LAST_CONTACT_AT_ISO),
    hasWebsite: false,
    createdAt: new Date(CREATED_AT_ISO),
    ...overrides,
  };
}

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute(makeSnapshot(overrides));
}

function expectSameLeadValues(actual: Lead, expected: Lead): void {
  expect(actual.id.getValue()).toBe(expected.id.getValue());
  expect(actual.businessName.getValue()).toBe(expected.businessName.getValue());
  expect(actual.sector.getValue()).toBe(expected.sector.getValue());
  expect(actual.location.getCity()).toBe(expected.location.getCity());
  expect(actual.location.getAddress()).toBe(expected.location.getAddress());
  expect(actual.contactInfo.getPhone()?.getValue() ?? null).toBe(
    expected.contactInfo.getPhone()?.getValue() ?? null,
  );
  expect(actual.contactInfo.getEmail()?.getValue() ?? null).toBe(
    expected.contactInfo.getEmail()?.getValue() ?? null,
  );
  expect(actual.status.getValue()).toBe(expected.status.getValue());
  expect(actual.notes).toBe(expected.notes);
  expect(actual.rating).toBe(expected.rating);
  expect(actual.contactCount).toBe(expected.contactCount);
  expect(actual.lastContactAt?.toISOString() ?? null).toBe(
    expected.lastContactAt?.toISOString() ?? null,
  );
  expect(actual.hasWebsite).toBe(expected.hasWebsite);
  expect(actual.createdAt.toISOString()).toBe(expected.createdAt.toISOString());
}

describe('SupabaseLeadMapper', () => {
  it('toDomain: should hydrate Lead from supabase row', () => {
    const lead = SupabaseLeadMapper.toDomain(makeRow());

    expect(lead.id.getValue()).toBe(LEAD_ID);
    expect(lead.businessName.getValue()).toBe('Acme Clinic');
    expect(lead.sector.getValue()).toBe('Clínicas & Consultórios');
    expect(lead.location.getCity()).toBe('Niterói');
    expect(lead.location.getAddress()).toBe('Rua A, 123');
    expect(lead.status.getValue()).toBe('contatado');
    expect(lead.notes).toBe('Lead interessado');
    expect(lead.rating).toBe(4.5);
    expect(lead.contactCount).toBe(2);
    expect(lead.lastContactAt?.toISOString()).toBe(LAST_CONTACT_AT_ISO);
    expect(lead.hasWebsite).toBe(false);
    expect(lead.createdAt.toISOString()).toBe(CREATED_AT_ISO);
    expect(lead.pullEvents()).toEqual([]);
  });

  it('toDomain: should map phone_digits via PhoneNumber.create', () => {
    const lead = SupabaseLeadMapper.toDomain(makeRow({ phone_digits: '+55 (21) 99999-0001' }));

    expect(lead.contactInfo.getPhone()?.getValue()).toBe('21999990001');
    expect(lead.contactInfo.getPhone()?.getFormatted()).toBe('(21) 99999-0001');
  });

  it('toDomain: should handle null phone_digits as null ContactInfo phone', () => {
    const lead = SupabaseLeadMapper.toDomain(makeRow({ phone_digits: null }));

    expect(lead.contactInfo.getPhone()).toBeNull();
    expect(lead.contactInfo.getEmail()?.getValue()).toBe('contato@acme.com');
  });

  it('toRow: should produce row matching supabase types', () => {
    const row: LeadPersistenceRow = SupabaseLeadMapper.toRow(makeLead());

    expect(row).toEqual({
      id: LEAD_ID,
      business_name: 'Acme Clinic',
      sector: 'Clínicas & Consultórios',
      city: 'Niterói',
      address: 'Rua A, 123',
      phone_digits: '21999990001',
      email: 'contato@acme.com',
      status: 'contatado',
      notes: 'Lead interessado',
      rating: 4.5,
      contact_count: 2,
      last_contact_at: LAST_CONTACT_AT_ISO,
      has_website: false,
      created_at: CREATED_AT_ISO,
    });
  });

  it('toRow: should produce only digits in phone_digits column', () => {
    const row = SupabaseLeadMapper.toRow(makeLead());

    expect(row.phone_digits).toBe('21999990001');
  });

  it('roundtrip: toDomain(toRow(lead)) should equal lead', () => {
    const original = makeLead();
    const row = SupabaseLeadMapper.toRow(original);
    const hydrated = SupabaseLeadMapper.toDomain({
      ...row,
      city_normalized: 'niterói',
      updated_at: UPDATED_AT_ISO,
      created_by: null,
      updated_by: null,
    });

    expectSameLeadValues(hydrated, original);
  });
});

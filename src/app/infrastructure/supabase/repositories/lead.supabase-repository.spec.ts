/** @jest-environment node */
import { Blob, File } from 'node:buffer';
import { ReadableStream, TransformStream } from 'node:stream/web';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

Object.assign(globalThis, { Blob, File, ReadableStream, TransformStream });
const { fetch, Headers, Request, Response, getGlobalDispatcher } = jest.requireActual<typeof import('undici')>('undici');
Object.assign(globalThis, { fetch, Headers, Request, Response });
import { Lead, type LeadSnapshot } from '@domain/lead/entities/lead.entity';
import { DuplicateLeadError } from '@domain/lead/errors/duplicate-lead.error';
import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { Email } from '@domain/lead/value-objects/email.vo';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import type { SupabaseClientService } from '../client/supabase.client';
import type { Database } from '../types/database.types';
import { LeadSupabaseRepository } from './lead.supabase-repository';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const BASE_CREATED_AT = new Date('2026-05-18T12:00:00.000Z');
const BASE_LAST_CONTACT_AT = new Date('2026-05-20T15:30:00.000Z');

const IDS = {
  one: '550e8400-e29b-41d4-a716-446655440001',
  two: '550e8400-e29b-41d4-a716-446655440002',
  three: '550e8400-e29b-41d4-a716-446655440003',
  four: '550e8400-e29b-41d4-a716-446655440004',
  missing: '550e8400-e29b-41d4-a716-446655449999',
} as const;

function makeRepository(client: SupabaseClient<Database>): LeadSupabaseRepository {
  return new LeadSupabaseRepository({ client } as SupabaseClientService);
}

function makeSnapshot(overrides: Partial<LeadSnapshot> = {}): LeadSnapshot {
  return {
    id: LeadId.fromString(IDS.one),
    businessName: BusinessName.create('Acme Clinic'),
    sector: Sector.create('Clínicas & Consultórios'),
    location: Location.create({ city: 'Niterói', address: 'Rua A, 123' }),
    contactInfo: ContactInfo.create({
      phone: PhoneNumber.create('(21) 99999-0001'),
      email: Email.create('contato@acme.com'),
    }),
    status: LeadStatus.novo(),
    notes: '',
    rating: null,
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    createdAt: BASE_CREATED_AT,
    ...overrides,
  };
}

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute(makeSnapshot(overrides));
}

function makePhone(value: string): PhoneNumber {
  return PhoneNumber.create(value);
}

function makeEmail(value = 'contato@acme.com'): Email {
  return Email.create(value);
}

function expectLeadValues(actual: Lead, expected: Lead): void {
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

describe('LeadSupabaseRepository', () => {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  const repository = makeRepository(supabase);

  beforeEach(async () => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error !== null) {
      throw error;
    }
  });

  afterAll(async () => {
    supabase.auth.stopAutoRefresh();
    await supabase.removeAllChannels();
    await getGlobalDispatcher().close();
  });

  it('save: should insert new lead', async () => {
    const lead = makeLead();

    await repository.save(lead);

    const found = await repository.findById(lead.id);
    expect(found).not.toBeNull();
    expect(found?.id.getValue()).toBe(lead.id.getValue());
  });

  it('save: should update existing lead (upsert)', async () => {
    const original = makeLead({ notes: 'Antes' });
    const updated = makeLead({ id: original.id, notes: 'Depois', status: LeadStatus.contatado() });

    await repository.save(original);
    await repository.save(updated);

    const found = await repository.findById(original.id);
    expect(found?.notes).toBe('Depois');
    expect(found?.status.getValue()).toBe('contatado');
  });

  it('save: should persist all fields including notes, rating, contactCount', async () => {
    const lead = makeLead({
      notes: 'Notas internas',
      rating: 4.5,
      contactCount: 3,
      lastContactAt: BASE_LAST_CONTACT_AT,
      hasWebsite: true,
    });

    await repository.save(lead);

    const found = await repository.findById(lead.id);
    expect(found?.notes).toBe('Notas internas');
    expect(found?.rating).toBe(4.5);
    expect(found?.contactCount).toBe(3);
    expect(found?.lastContactAt?.toISOString()).toBe(BASE_LAST_CONTACT_AT.toISOString());
    expect(found?.hasWebsite).toBe(true);
  });

  it('save: should convert PostgreSQL 23505 duplicate phone/city into DuplicateLeadError', async () => {
    await repository.save(makeLead());
    const duplicate = makeLead({ id: LeadId.fromString(IDS.two) });

    await expect(repository.save(duplicate)).rejects.toBeInstanceOf(DuplicateLeadError);
  });

  it('findById: should return Lead when exists', async () => {
    const lead = makeLead({ notes: 'Existe' });
    await repository.save(lead);

    const found = await repository.findById(lead.id);

    expect(found).not.toBeNull();
    expectLeadValues(found as Lead, lead);
  });

  it('findById: should return null when not exists', async () => {
    const found = await repository.findById(LeadId.fromString(IDS.missing));

    expect(found).toBeNull();
  });

  it('findAll: should return all leads when no filter', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one) }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    const leads = await repository.findAll();

    expect(leads).toHaveLength(2);
  });

  it('findAll: should filter by status', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), status: LeadStatus.novo() }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        status: LeadStatus.contatado(),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    const leads = await repository.findAll({ status: LeadStatus.contatado() });

    expect(leads).toHaveLength(1);
    expect(leads[0]?.status.getValue()).toBe('contatado');
  });

  it('findAll: should filter by sector', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), sector: Sector.create('Restaurantes') }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        sector: Sector.create('Advocacia'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    const leads = await repository.findAll({ sector: Sector.create('Advocacia') });

    expect(leads).toHaveLength(1);
    expect(leads[0]?.sector.getValue()).toBe('Advocacia');
  });

  it('findAll: should filter by textQuery matching businessName', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), businessName: BusinessName.create('Alpha Clinic') }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        businessName: BusinessName.create('Beta Office'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    const leads = await repository.findAll({ textQuery: 'alpha' });

    expect(leads).toHaveLength(1);
    expect(leads[0]?.businessName.getValue()).toBe('Alpha Clinic');
  });

  it('findAll: should filter by textQuery matching city', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), location: Location.create({ city: 'Niterói' }) }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        location: Location.create({ city: 'Rio de Janeiro' }),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    const leads = await repository.findAll({ textQuery: 'janeiro' });

    expect(leads).toHaveLength(1);
    expect(leads[0]?.location.getCity()).toBe('Rio de Janeiro');
  });

  it('findAll: should filter by textQuery matching sector', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), sector: Sector.create('Restaurantes') }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        sector: Sector.create('Contabilidade'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    const leads = await repository.findAll({ textQuery: 'contab' });

    expect(leads).toHaveLength(1);
    expect(leads[0]?.sector.getValue()).toBe('Contabilidade');
  });

  it('findAll: should sort by createdAt DESC by default', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), createdAt: new Date('2026-05-18T12:00:00.000Z') }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        createdAt: new Date('2026-05-20T12:00:00.000Z'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    const leads = await repository.findAll();

    expect(leads[0]?.id.getValue()).toBe(IDS.two);
    expect(leads[1]?.id.getValue()).toBe(IDS.one);
  });

  it('findAll: should sort by rating with NULLS LAST', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), rating: null }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        rating: 5,
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.three),
        rating: 3,
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0003') }),
      }),
    );

    const leads = await repository.findAll({ sortBy: 'rating', sortOrder: 'desc' });

    expect(leads.map((lead) => lead.rating)).toEqual([5, 3, null]);
  });

  it('findAll: should sort by lastContactAt with NULLS LAST', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), lastContactAt: null }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        lastContactAt: new Date('2026-05-20T12:00:00.000Z'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.three),
        lastContactAt: new Date('2026-05-19T12:00:00.000Z'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0003') }),
      }),
    );

    const leads = await repository.findAll({ sortBy: 'lastContactAt', sortOrder: 'desc' });

    expect(leads.map((lead) => lead.lastContactAt?.toISOString() ?? null)).toEqual([
      '2026-05-20T12:00:00.000Z',
      '2026-05-19T12:00:00.000Z',
      null,
    ]);
  });

  it('findAll: should respect limit and offset', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), createdAt: new Date('2026-05-21T12:00:00.000Z') }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        createdAt: new Date('2026-05-20T12:00:00.000Z'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.three),
        createdAt: new Date('2026-05-19T12:00:00.000Z'),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0003') }),
      }),
    );

    const leads = await repository.findAll({ limit: 1, offset: 1 });

    expect(leads).toHaveLength(1);
    expect(leads[0]?.id.getValue()).toBe(IDS.two);
  });

  it('existsByPhoneAndCity: should return true for normalized phone match in same city', async () => {
    await repository.save(makeLead());

    await expect(repository.existsByPhoneAndCity(makePhone('+55 21 99999-0001'), 'Niterói')).resolves.toBe(true);
  });

  it('existsByPhoneAndCity: should return true regardless of city case', async () => {
    await repository.save(makeLead({ location: Location.create({ city: 'Niterói' }) }));

    await expect(repository.existsByPhoneAndCity(makePhone('(21) 99999-0001'), 'NITERÓI')).resolves.toBe(true);
  });

  it('existsByPhoneAndCity: should return false when phone matches but city differs', async () => {
    await repository.save(makeLead({ location: Location.create({ city: 'Niterói' }) }));

    await expect(repository.existsByPhoneAndCity(makePhone('(21) 99999-0001'), 'São Gonçalo')).resolves.toBe(false);
  });

  it('delete: should remove lead from database', async () => {
    const lead = makeLead();
    await repository.save(lead);

    await repository.delete(lead.id);

    await expect(repository.findById(lead.id)).resolves.toBeNull();
  });

  it('delete: should throw LeadNotFoundError when lead does not exist', async () => {
    await expect(repository.delete(LeadId.fromString(IDS.missing))).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it('count: should return correct count for filter', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), status: LeadStatus.novo() }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        status: LeadStatus.contatado(),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );

    await expect(repository.count({ status: LeadStatus.contatado() })).resolves.toBe(1);
  });

  it('statsByStatus: should return counts grouped by status', async () => {
    await repository.save(makeLead({ id: LeadId.fromString(IDS.one), status: LeadStatus.novo() }));
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.two),
        status: LeadStatus.contatado(),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0002') }),
      }),
    );
    await repository.save(
      makeLead({
        id: LeadId.fromString(IDS.three),
        status: LeadStatus.proposta(),
        contactInfo: ContactInfo.create({ phone: makePhone('(21) 99999-0003') }),
      }),
    );

    await expect(repository.statsByStatus()).resolves.toEqual({
      total: 3,
      novo: 1,
      contatado: 1,
      proposta: 1,
      fechado: 0,
      descartado: 0,
    });
  });
});

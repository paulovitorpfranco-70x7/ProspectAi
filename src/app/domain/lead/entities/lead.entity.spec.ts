import { InvalidStatusTransitionError } from '../errors/invalid-status-transition.error';
import { LeadMissingContactChannelError } from '../errors/lead-missing-contact-channel.error';
import { LeadNotesTooLongError } from '../errors/lead-notes-too-long.error';
import { LeadRatingInvalidError } from '../errors/lead-rating-invalid.error';
import { LeadContactedEvent } from '../events/lead-contacted.event';
import { LeadCreatedEvent } from '../events/lead-created.event';
import { LeadStatusChangedEvent } from '../events/lead-status-changed.event';
import { BusinessName } from '../value-objects/business-name.vo';
import { ContactInfo } from '../value-objects/contact-info.vo';
import { Email } from '../value-objects/email.vo';
import { LeadId } from '../value-objects/lead-id.vo';
import { LeadStatus } from '../value-objects/lead-status.vo';
import { Location } from '../value-objects/location.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { Sector } from '../value-objects/sector.vo';
import { Lead, type LeadCreateInput, type LeadSnapshot } from './lead.entity';

const NOW = new Date('2026-05-18T12:00:00Z');
const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('Lead', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("create: should produce Lead with status='novo' by default", () => {
    const lead = Lead.create(makeCreateInput());

    expect(lead.status.getValue()).toBe('novo');
  });

  it('create: should set hasWebsite=false by default', () => {
    const lead = Lead.create(makeCreateInput());

    expect(lead.hasWebsite).toBe(false);
  });

  it('create: should accept rating between 0 and 5', () => {
    expect(Lead.create(makeCreateInput({ rating: 0 })).rating).toBe(0);
    expect(Lead.create(makeCreateInput({ rating: 5 })).rating).toBe(5);
  });

  it('create: should throw LeadRatingInvalidError for rating < 0', () => {
    expect(() => Lead.create(makeCreateInput({ rating: -1 }))).toThrow(LeadRatingInvalidError);
  });

  it('create: should throw LeadRatingInvalidError for rating > 5', () => {
    expect(() => Lead.create(makeCreateInput({ rating: 6 }))).toThrow(LeadRatingInvalidError);
  });

  it('create: should emit LeadCreatedEvent on creation', () => {
    const lead = Lead.create(makeCreateInput());

    const events = lead.pullEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(LeadCreatedEvent);
  });

  it('create: should set createdAt to current time', () => {
    const lead = Lead.create(makeCreateInput());

    expect(lead.createdAt).toEqual(NOW);
  });

  it('reconstitute: should NOT emit LeadCreatedEvent', () => {
    const lead = Lead.reconstitute(makeSnapshot());

    expect(lead.pullEvents()).toEqual([]);
  });

  it('reconstitute: should expose snapshot values through getters', () => {
    const snapshot = makeSnapshot({
      notes: 'Observação',
      contactCount: 2,
      lastContactAt: new Date('2026-05-17T12:00:00Z'),
      hasWebsite: true,
      rating: 4.5,
    });

    const lead = Lead.reconstitute(snapshot);

    expect(lead.id).toBe(snapshot.id);
    expect(lead.businessName).toBe(snapshot.businessName);
    expect(lead.sector).toBe(snapshot.sector);
    expect(lead.location).toBe(snapshot.location);
    expect(lead.contactInfo).toBe(snapshot.contactInfo);
    expect(lead.status).toBe(snapshot.status);
    expect(lead.notes).toBe('Observação');
    expect(lead.contactCount).toBe(2);
    expect(lead.lastContactAt).toEqual(snapshot.lastContactAt);
    expect(lead.hasWebsite).toBe(true);
    expect(lead.rating).toBe(4.5);
    expect(lead.createdAt).toBe(snapshot.createdAt);
  });

  it('changeStatus: should change status when transition is valid', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.novo() }));

    lead.changeStatus(LeadStatus.contatado());

    expect(lead.status.getValue()).toBe('contatado');
  });

  it('changeStatus: should throw InvalidStatusTransitionError for invalid transition', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.novo() }));

    expect(() => lead.changeStatus(LeadStatus.fechado())).toThrow(InvalidStatusTransitionError);
  });

  it('changeStatus: should emit LeadStatusChangedEvent with from and to', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.novo() }));

    lead.changeStatus(LeadStatus.contatado());
    const [event] = lead.pullEvents();

    expect(event).toBeInstanceOf(LeadStatusChangedEvent);
    expect((event as LeadStatusChangedEvent).from.getValue()).toBe('novo');
    expect((event as LeadStatusChangedEvent).to.getValue()).toBe('contatado');
  });

  it('registerContact: should increment contactCount by 1', () => {
    const lead = Lead.reconstitute(makeSnapshot({ contactCount: 2 }));

    lead.registerContact('whatsapp', NOW);

    expect(lead.contactCount).toBe(3);
  });

  it('registerContact: should set lastContactAt to provided date', () => {
    const contactedAt = new Date('2026-05-18T10:00:00Z');
    const lead = Lead.reconstitute(makeSnapshot());

    lead.registerContact('whatsapp', contactedAt);

    expect(lead.lastContactAt).toBe(contactedAt);
  });

  it('registerContact: should auto-transition novo → contatado on whatsapp', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.novo() }));

    lead.registerContact('whatsapp', NOW);

    expect(lead.status.getValue()).toBe('contatado');
  });

  it('registerContact: should auto-transition novo → contatado on email', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.novo() }));

    lead.registerContact('email', NOW);

    expect(lead.status.getValue()).toBe('contatado');
  });

  it('registerContact: should NOT transition when status is contatado', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.contatado() }));

    lead.registerContact('whatsapp', NOW);

    expect(lead.status.getValue()).toBe('contatado');
  });

  it('registerContact: should NOT transition when status is proposta', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.proposta() }));

    lead.registerContact('whatsapp', NOW);

    expect(lead.status.getValue()).toBe('proposta');
  });

  it('registerContact: should emit LeadContactedEvent', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.contatado() }));

    lead.registerContact('whatsapp', NOW);
    const [event] = lead.pullEvents();

    expect(event).toBeInstanceOf(LeadContactedEvent);
    expect((event as LeadContactedEvent).channel).toBe('whatsapp');
  });

  it('registerContact: should emit BOTH LeadContactedEvent AND LeadStatusChangedEvent when auto-transitioning', () => {
    const lead = Lead.reconstitute(makeSnapshot({ status: LeadStatus.novo() }));

    lead.registerContact('whatsapp', NOW);
    const events = lead.pullEvents();

    expect(events).toHaveLength(2);
    expect(events[0]).toBeInstanceOf(LeadContactedEvent);
    expect(events[1]).toBeInstanceOf(LeadStatusChangedEvent);
  });

  it('registerContact: should throw LeadMissingContactChannelError when channel=whatsapp and no phone', () => {
    const lead = Lead.reconstitute(
      makeSnapshot({ contactInfo: ContactInfo.create({ email: makeEmail() }) }),
    );

    expect(() => lead.registerContact('whatsapp', NOW)).toThrow(LeadMissingContactChannelError);
  });

  it('registerContact: should throw LeadMissingContactChannelError when channel=email and no email', () => {
    const lead = Lead.reconstitute(
      makeSnapshot({ contactInfo: ContactInfo.create({ phone: makePhone() }) }),
    );

    expect(() => lead.registerContact('email', NOW)).toThrow(LeadMissingContactChannelError);
  });

  it('updateNotes: should accept empty string', () => {
    const lead = Lead.reconstitute(makeSnapshot({ notes: 'texto' }));

    lead.updateNotes('');

    expect(lead.notes).toBe('');
  });

  it('updateNotes: should accept 2000 chars', () => {
    const notes = 'A'.repeat(2000);
    const lead = Lead.reconstitute(makeSnapshot());

    lead.updateNotes(notes);

    expect(lead.notes).toBe(notes);
  });

  it('updateNotes: should throw LeadNotesTooLongError at 2001 chars', () => {
    const lead = Lead.reconstitute(makeSnapshot());

    expect(() => lead.updateNotes('A'.repeat(2001))).toThrow(LeadNotesTooLongError);
  });

  it('isStale: should return false when status is not contatado', () => {
    const lead = Lead.reconstitute(
      makeSnapshot({
        status: LeadStatus.proposta(),
        lastContactAt: new Date('2026-05-14T12:00:00Z'),
      }),
    );

    expect(lead.isStale(NOW, 3)).toBe(false);
  });

  it('isStale: should return false when lastContactAt is null', () => {
    const lead = Lead.reconstitute(
      makeSnapshot({
        status: LeadStatus.contatado(),
        lastContactAt: null,
      }),
    );

    expect(lead.isStale(NOW, 3)).toBe(false);
  });

  it('isStale: should return true when status=contatado and ≥ threshold days passed', () => {
    const lead = Lead.reconstitute(
      makeSnapshot({
        status: LeadStatus.contatado(),
        lastContactAt: new Date('2026-05-15T12:00:00Z'),
      }),
    );

    expect(lead.isStale(NOW, 3)).toBe(true);
  });

  it('isStale: should return false when exactly threshold-1 days passed', () => {
    const lead = Lead.reconstitute(
      makeSnapshot({
        status: LeadStatus.contatado(),
        lastContactAt: new Date('2026-05-16T12:00:00Z'),
      }),
    );

    expect(lead.isStale(NOW, 3)).toBe(false);
  });

  it('pullEvents: should return accumulated events', () => {
    const lead = Lead.create(makeCreateInput());

    const events = lead.pullEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(LeadCreatedEvent);
  });

  it('pullEvents: should clear internal buffer after call', () => {
    const lead = Lead.create(makeCreateInput());

    lead.pullEvents();

    expect(lead.pullEvents()).toEqual([]);
  });

  it('pullEvents: should return empty array when no events', () => {
    const lead = Lead.reconstitute(makeSnapshot());

    expect(lead.pullEvents()).toEqual([]);
  });
});

function makeCreateInput(overrides: Partial<LeadCreateInput> = {}): LeadCreateInput {
  return {
    businessName: makeBusinessName(),
    sector: makeSector(),
    location: makeLocation(),
    contactInfo: makeContactInfo(),
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<LeadSnapshot> = {}): LeadSnapshot {
  return {
    id: makeLeadId(),
    businessName: makeBusinessName(),
    sector: makeSector(),
    location: makeLocation(),
    contactInfo: makeContactInfo(),
    status: LeadStatus.novo(),
    notes: '',
    rating: null,
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    createdAt: NOW,
    ...overrides,
  };
}

function makeLeadId(): LeadId {
  return LeadId.fromString(LEAD_ID);
}

function makeBusinessName(): BusinessName {
  return BusinessName.create('Silabala Tecnologia');
}

function makeSector(): Sector {
  return Sector.create('Restaurantes');
}

function makeLocation(): Location {
  return Location.create({ city: 'Niterói' });
}

function makeContactInfo(): ContactInfo {
  return ContactInfo.create({
    phone: makePhone(),
    email: makeEmail(),
  });
}

function makePhone(): PhoneNumber {
  return PhoneNumber.create('(21) 99999-0001');
}

function makeEmail(): Email {
  return Email.create('user@domain.com');
}

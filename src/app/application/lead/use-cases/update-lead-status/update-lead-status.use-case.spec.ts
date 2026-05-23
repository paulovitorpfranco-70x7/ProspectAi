import { InvalidStatusTransitionError } from '@domain/lead/errors/invalid-status-transition.error';
import { LeadIdInvalidError } from '@domain/lead/errors/lead-id-invalid.error';
import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import { LeadStatusInvalidError } from '@domain/lead/errors/lead-status-invalid.error';
import { Lead, type LeadSnapshot } from '@domain/lead/entities/lead.entity';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { Email } from '@domain/lead/value-objects/email.vo';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { UpdateLeadStatusUseCase } from './update-lead-status.use-case';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';
const CREATED_AT = new Date('2026-05-18T12:00:00.000Z');

function makeRepositoryMock(): jest.Mocked<LeadRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    existsByPhoneAndCity: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    statsByStatus: jest.fn(),
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
    status: LeadStatus.novo(),
    notes: '',
    rating: 4.5,
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute(makeSnapshot(overrides));
}

describe('UpdateLeadStatusUseCase', () => {
  it('should throw LeadIdInvalidError when leadId is not UUID', async () => {
    const repository = makeRepositoryMock();
    const useCase = new UpdateLeadStatusUseCase(repository);

    await expect(
      useCase.execute({ leadId: 'invalid-id', newStatus: 'contatado' }),
    ).rejects.toBeInstanceOf(LeadIdInvalidError);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw LeadNotFoundError when repository returns null', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(null);
    const useCase = new UpdateLeadStatusUseCase(repository);

    await expect(
      useCase.execute({ leadId: LEAD_ID, newStatus: 'contatado' }),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw LeadStatusInvalidError for unknown status string', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(makeLead());
    const useCase = new UpdateLeadStatusUseCase(repository);

    await expect(useCase.execute({ leadId: LEAD_ID, newStatus: 'unknown' })).rejects.toBeInstanceOf(
      LeadStatusInvalidError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw InvalidStatusTransitionError for forbidden transition', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(makeLead({ status: LeadStatus.novo() }));
    const useCase = new UpdateLeadStatusUseCase(repository);

    await expect(useCase.execute({ leadId: LEAD_ID, newStatus: 'fechado' })).rejects.toBeInstanceOf(
      InvalidStatusTransitionError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should call repository.save with updated lead on success', async () => {
    const repository = makeRepositoryMock();
    const lead = makeLead({ status: LeadStatus.novo() });
    repository.findById.mockResolvedValueOnce(lead);
    const useCase = new UpdateLeadStatusUseCase(repository);

    await useCase.execute({ leadId: LEAD_ID, newStatus: 'contatado' });

    expect(lead.status.getValue()).toBe('contatado');
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(lead);
  });

  it('should return updated LeadDto with new status', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(makeLead({ status: LeadStatus.novo() }));
    const useCase = new UpdateLeadStatusUseCase(repository);

    const output = await useCase.execute({ leadId: LEAD_ID, newStatus: 'contatado' });

    expect(output.lead).toMatchObject({
      id: LEAD_ID,
      businessName: 'Acme Clinic',
      sector: 'Clínicas & Consultórios',
      city: 'Niterói',
      status: 'contatado',
      createdAtIso: '2026-05-18T12:00:00.000Z',
    });
  });
});

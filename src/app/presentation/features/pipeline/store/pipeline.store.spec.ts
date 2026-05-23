import { TestBed } from '@angular/core/testing';
import {
  DeleteLeadUseCase,
  LEAD_REPOSITORY,
  SendEmailUseCase,
  SendWhatsAppUseCase,
  UpdateLeadStatusUseCase,
  type LeadDto,
} from '@application/lead';
import { InvalidStatusTransitionError } from '@domain/lead/errors/invalid-status-transition.error';
import { Lead } from '@domain/lead/entities/lead.entity';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { PipelineStore } from './pipeline.store';

const LEAD_ID = '123e4567-e89b-42d3-a456-426614174000';

function makeLead(overrides: Partial<{ status: ReturnType<typeof LeadStatus.create> }> = {}): Lead {
  return Lead.reconstitute({
    id: LeadId.fromString(LEAD_ID),
    businessName: BusinessName.create('Acme Clinic'),
    sector: Sector.create('Clínicas & Consultórios'),
    location: Location.create({ city: 'Niterói', address: 'Rua A, 123' }),
    contactInfo: ContactInfo.create({ phone: PhoneNumber.create('(21) 99999-0001') }),
    status: overrides.status ?? LeadStatus.novo(),
    notes: '',
    rating: 4.5,
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    createdAt: new Date('2026-05-18T12:00:00Z'),
  });
}

function makeLeadDto(overrides: Partial<LeadDto> = {}): LeadDto {
  return {
    id: LEAD_ID,
    businessName: 'Acme Clinic',
    sector: 'Clínicas & Consultórios',
    city: 'Niterói',
    address: 'Rua A, 123',
    phone: '(21) 99999-0001',
    phoneDigits: '21999990001',
    email: null,
    status: 'novo',
    notes: '',
    rating: 4.5,
    contactCount: 0,
    lastContactAtIso: null,
    hasWebsite: false,
    createdAtIso: '2026-05-18T12:00:00.000Z',
    ...overrides,
  };
}

function makeRepositoryMock(): jest.Mocked<LeadRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    existsByPhoneAndCity: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    statsByStatus: jest.fn(),
  };
}

function setup() {
  const repository = makeRepositoryMock();
  const updateStatus = { execute: jest.fn() };
  const deleteLead = { execute: jest.fn() };
  const sendWhatsApp = { execute: jest.fn() };
  const sendEmail = { execute: jest.fn() };

  TestBed.configureTestingModule({
    providers: [
      PipelineStore,
      { provide: LEAD_REPOSITORY, useValue: repository },
      { provide: UpdateLeadStatusUseCase, useValue: updateStatus },
      { provide: DeleteLeadUseCase, useValue: deleteLead },
      { provide: SendWhatsAppUseCase, useValue: sendWhatsApp },
      { provide: SendEmailUseCase, useValue: sendEmail },
    ],
  });

  return {
    store: TestBed.inject(PipelineStore),
    repository,
    updateStatus,
    deleteLead,
    sendWhatsApp,
    sendEmail,
  };
}

describe('PipelineStore', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should load leads on init via loadLeads()', async () => {
    const { store, repository } = setup();
    repository.findAll.mockResolvedValueOnce([makeLead()]);

    await store.loadLeads();

    expect(repository.findAll).toHaveBeenCalledWith({ sortBy: 'createdAt', sortOrder: 'desc' });
    expect(store.leads()).toHaveLength(1);
    expect(store.leads()[0]?.businessName).toBe('Acme Clinic');
    expect(store.loading()).toBe(false);
  });

  it('should update lead in state after updateStatus succeeds', async () => {
    const { store, repository, updateStatus } = setup();
    repository.findAll.mockResolvedValueOnce([makeLead()]);
    await store.loadLeads();
    updateStatus.execute.mockResolvedValueOnce({ lead: makeLeadDto({ status: 'contatado' }) });

    await store.updateStatus(LEAD_ID, 'contatado');

    expect(updateStatus.execute).toHaveBeenCalledWith({ leadId: LEAD_ID, newStatus: 'contatado' });
    expect(store.leads()[0]?.status).toBe('contatado');
  });

  it('should remove lead from state after delete succeeds', async () => {
    const { store, repository, deleteLead } = setup();
    repository.findAll.mockResolvedValueOnce([makeLead()]);
    deleteLead.execute.mockResolvedValueOnce({ leadId: LEAD_ID, deletedAtIso: '2026-05-18T12:00:00.000Z' });
    await store.loadLeads();

    await store.deleteLead(LEAD_ID);

    expect(deleteLead.execute).toHaveBeenCalledWith({ leadId: LEAD_ID });
    expect(store.leads()).toEqual([]);
  });

  it('should show error toast when updateStatus throws InvalidStatusTransitionError', async () => {
    const { store, updateStatus } = setup();
    updateStatus.execute.mockRejectedValueOnce(new InvalidStatusTransitionError('novo', 'fechado'));

    await store.updateStatus(LEAD_ID, 'fechado');

    expect(store.error()).toContain('Transição inválida');
  });
});

import { TestBed } from '@angular/core/testing';
import {
  DeleteLeadUseCase,
  LEAD_REPOSITORY,
  SendEmailUseCase,
  SendWhatsAppUseCase,
  UpdateLeadStatusUseCase,
  type LeadDto,
} from '@application/lead';
import {
  OutreachQueueService,
  type OutreachQueueItem,
} from '@application/outreach/outreach-queue.service';
import { InvalidStatusTransitionError } from '@domain/lead/errors/invalid-status-transition.error';
import { Lead, type LeadSnapshot } from '@domain/lead/entities/lead.entity';
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

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute({
    id: LeadId.fromString(LEAD_ID),
    googlePlaceId: null,
    businessName: BusinessName.create('Acme Clinic'),
    sector: Sector.create('Clínicas & Consultórios'),
    location: Location.create({ city: 'Niterói', address: 'Rua A, 123' }),
    contactInfo: ContactInfo.create({ phone: PhoneNumber.create('(21) 99999-0001') }),
    status: LeadStatus.novo(),
    notes: '',
    rating: 4.5,
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    instagramHandle: null,
    websiteQuality: null,
    leadScore: 0,
    openingHours: null,
    topReviews: null,
    previewUrl: null,
    previewViews: 0,
    previewLastViewedAt: null,
    createdAt: new Date('2026-05-18T12:00:00Z'),
    ...overrides,
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
    instagramHandle: null,
    websiteQuality: null,
    leadScore: 0,
    openingHours: null,
    topReviews: null,
    previewUrl: null,
    previewViews: 0,
    previewLastViewedAtIso: null,
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
    existsByGooglePlaceId: jest.fn(),
    updatePlaceDetailsByGooglePlaceId: jest.fn(),
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
  const outreachQueue = {
    montarFila: jest.fn().mockResolvedValue({
      followups: [],
      novos: [],
      enviadosHoje: [],
      contadorHoje: 0,
    }),
    confirmarEnvio: jest.fn(),
  };

  TestBed.configureTestingModule({
    providers: [
      PipelineStore,
      { provide: LEAD_REPOSITORY, useValue: repository },
      { provide: UpdateLeadStatusUseCase, useValue: updateStatus },
      { provide: DeleteLeadUseCase, useValue: deleteLead },
      { provide: SendWhatsAppUseCase, useValue: sendWhatsApp },
      { provide: SendEmailUseCase, useValue: sendEmail },
      { provide: OutreachQueueService, useValue: outreachQueue },
    ],
  });

  return {
    store: TestBed.inject(PipelineStore),
    repository,
    updateStatus,
    deleteLead,
    sendWhatsApp,
    sendEmail,
    outreachQueue,
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

  it('should sort by leadScore descending and break ties by newest creation', async () => {
    const { store, repository } = setup();
    repository.findAll.mockResolvedValueOnce([
      makeLead({
        businessName: BusinessName.create('Score 60'),
        leadScore: 60,
        createdAt: new Date('2026-05-20T12:00:00Z'),
      }),
      makeLead({
        businessName: BusinessName.create('Score 90 antigo'),
        leadScore: 90,
        createdAt: new Date('2026-05-18T12:00:00Z'),
      }),
      makeLead({
        businessName: BusinessName.create('Score 90 recente'),
        leadScore: 90,
        createdAt: new Date('2026-05-19T12:00:00Z'),
      }),
    ]);

    await store.loadLeads();

    expect(store.sortBy()).toBe('leadScore');
    expect(store.filteredLeads().map((lead) => lead.businessName)).toEqual([
      'Score 90 recente',
      'Score 90 antigo',
      'Score 60',
    ]);
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
    deleteLead.execute.mockResolvedValueOnce({
      leadId: LEAD_ID,
      deletedAtIso: '2026-05-18T12:00:00.000Z',
    });
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

  it('should load the existing daily queue with follow-ups before new leads', async () => {
    const { store, outreachQueue } = setup();
    const followup = makeQueueItem({ stage: 'f1_d2' });
    const novo = makeQueueItem({ stage: 'm1a_permissao' });
    outreachQueue.montarFila.mockResolvedValueOnce({
      followups: [followup],
      novos: [novo],
      enviadosHoje: [],
      contadorHoje: 0,
    });

    await store.loadOutreachQueue();

    expect(store.outreachQueueSections().map((section) => section.key)).toEqual([
      'followups',
      'novos',
    ]);
    expect(store.outreachFollowups()).toEqual([followup]);
    expect(store.outreachNovos()).toEqual([novo]);
  });

  it('should move a confirmed item to sent today and keep the limit non-blocking', async () => {
    const { store, outreachQueue } = setup();
    const item = makeQueueItem();
    outreachQueue.montarFila.mockResolvedValueOnce({
      followups: [],
      novos: [item],
      enviadosHoje: [],
      contadorHoje: 14,
    });
    outreachQueue.confirmarEnvio.mockResolvedValueOnce({});
    await store.loadOutreachQueue();

    await store.confirmOutreach(item);

    expect(outreachQueue.confirmarEnvio).toHaveBeenCalledWith(item);
    expect(store.outreachNovos()).toEqual([]);
    expect(store.outreachEnviadosHoje()).toEqual([item]);
    expect(store.dailySentCount()).toBe(15);
    expect(store.dailyLimitReached()).toBe(true);
  });
});

function makeQueueItem(overrides: Partial<OutreachQueueItem> = {}): OutreachQueueItem {
  return {
    lead: makeLead(),
    stage: 'm1a_permissao',
    variant: 'A',
    mensagemRenderizada: 'Mensagem pronta',
    whatsappUrl: 'https://wa.me/5521999990001?text=Mensagem%20pronta',
    telefoneInvalido: false,
    bairro: 'Rua A, 123',
    avaliacoes: null,
    ...overrides,
  };
}

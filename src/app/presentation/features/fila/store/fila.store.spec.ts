import { TestBed } from '@angular/core/testing';
import {
  OutreachQueueService,
  type OutreachQueueItem,
} from '@application/outreach/outreach-queue.service';
import { Lead, type LeadSnapshot } from '@domain/lead/entities/lead.entity';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import type { OutreachEvent } from '@domain/outreach/types';
import { FilaStore } from './fila.store';

const LEAD_ID = '123e4567-e89b-42d3-a456-426614174000';
const EVENT_ID = '123e4567-e89b-42d3-a456-426614174010';

function setup() {
  const outreachQueue = {
    montarFila: jest.fn().mockResolvedValue({
      followups: [],
      novos: [],
      enviadosHoje: [],
      contadorHoje: 0,
    }),
    confirmarEnvio: jest.fn(),
    desfazerEnvio: jest.fn(),
  };

  TestBed.configureTestingModule({
    providers: [FilaStore, { provide: OutreachQueueService, useValue: outreachQueue }],
  });

  return { store: TestBed.inject(FilaStore), outreachQueue };
}

describe('FilaStore', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should load follow-ups before new leads', async () => {
    const { store, outreachQueue } = setup();
    const followup = makeQueueItem({ stage: 'f1_d2' });
    const novo = makeQueueItem();
    outreachQueue.montarFila.mockResolvedValueOnce(queueOf([followup], [novo]));

    await store.loadOutreachQueue();

    expect(store.outreachQueueSections().map((section) => section.key)).toEqual([
      'followups',
      'novos',
    ]);
    expect(store.outreachFollowups()).toEqual([followup]);
    expect(store.outreachNovos()).toEqual([novo]);
  });

  it('should filter follow-ups and new leads by the selected sector', async () => {
    const { store, outreachQueue } = setup();
    const followupClinica = makeQueueItemForSector(
      '123e4567-e89b-42d3-a456-426614174001',
      'Clínicas & Consultórios',
      { stage: 'f1_d2' },
    );
    const novoSalao = makeQueueItemForSector(
      '123e4567-e89b-42d3-a456-426614174002',
      'Salões & Barbearias',
    );
    outreachQueue.montarFila.mockResolvedValueOnce(queueOf([followupClinica], [novoSalao]));
    await store.loadOutreachQueue();

    store.selecionarSetorFila('Clínicas & Consultórios');

    expect(store.outreachFollowupsFiltrados()).toEqual([followupClinica]);
    expect(store.outreachNovosFiltrados()).toEqual([]);
  });

  it('should return the entire queue for a null sector and reset the active sector', async () => {
    const { store, outreachQueue } = setup();
    const followup = makeQueueItemForSector(
      '123e4567-e89b-42d3-a456-426614174001',
      'Clínicas & Consultórios',
      { stage: 'f1_d2' },
    );
    const novo = makeQueueItemForSector(
      '123e4567-e89b-42d3-a456-426614174002',
      'Salões & Barbearias',
    );
    outreachQueue.montarFila.mockResolvedValueOnce(queueOf([followup], [novo]));
    await store.loadOutreachQueue();

    store.selecionarSetorFila('Salões & Barbearias');
    store.selecionarSetorFila('Salões & Barbearias');

    expect(store.setorFilaSelecionado()).toBeNull();
    expect(store.outreachQueueSections().flatMap((section) => section.items)).toEqual([
      followup,
      novo,
    ]);
  });

  it('should count only sectors represented in the queue', async () => {
    const { store, outreachQueue } = setup();
    const followupSalao = makeQueueItemForSector(
      '123e4567-e89b-42d3-a456-426614174001',
      'Salões & Barbearias',
      { stage: 'f1_d2' },
    );
    const novoSalao = makeQueueItemForSector(
      '123e4567-e89b-42d3-a456-426614174002',
      'Salões & Barbearias',
    );
    const novoClinica = makeQueueItemForSector(
      '123e4567-e89b-42d3-a456-426614174003',
      'Clínicas & Consultórios',
    );
    outreachQueue.montarFila.mockResolvedValueOnce(
      queueOf([followupSalao], [novoSalao, novoClinica]),
    );
    await store.loadOutreachQueue();

    expect(store.setoresFila()).toEqual([
      { sector: 'Salões & Barbearias', count: 2 },
      { sector: 'Clínicas & Consultórios', count: 1 },
    ]);
    expect(store.setoresFila().reduce((total, item) => total + item.count, 0)).toBe(
      store.outreachQueueTotal(),
    );
    expect(store.setoresFila().some((item) => item.sector === 'Restaurantes')).toBe(false);
  });

  it('should confirm an awaiting item exactly once', async () => {
    const { store, outreachQueue } = setup();
    const item = makeQueueItem();
    outreachQueue.montarFila.mockResolvedValueOnce(queueOf([], [item]));
    outreachQueue.confirmarEnvio.mockResolvedValueOnce(makeOutreachEvent());
    await store.loadOutreachQueue();
    store.markOutreachAwaitingConfirmation(item);

    await Promise.all([store.confirmOutreach(item), store.confirmOutreach(item)]);

    expect(outreachQueue.confirmarEnvio).toHaveBeenCalledTimes(1);
    expect(store.outreachNovos()).toEqual([]);
    expect(store.outreachEnviadosHoje()).toHaveLength(1);
  });

  it('should discard confirmation without removing the queue item', async () => {
    const { store, outreachQueue } = setup();
    const item = makeQueueItem();
    outreachQueue.montarFila.mockResolvedValueOnce(queueOf([], [item]));
    await store.loadOutreachQueue();
    store.markOutreachAwaitingConfirmation(item);

    store.discardOutreachConfirmation(item);

    expect(store.isOutreachAwaitingConfirmation(item)).toBe(false);
    expect(store.outreachNovos()).toEqual([item]);
    expect(outreachQueue.confirmarEnvio).not.toHaveBeenCalled();
  });

  it('should undo a sent item and reload it into the new-lead queue', async () => {
    const { store, outreachQueue } = setup();
    const sentItem = makeQueueItem({
      eventId: EVENT_ID,
      sentAt: new Date('2026-08-11T12:00:00.000Z'),
    });
    const restoredItem = makeQueueItem();
    outreachQueue.montarFila
      .mockResolvedValueOnce({ ...queueOf([], []), enviadosHoje: [sentItem], contadorHoje: 1 })
      .mockResolvedValueOnce(queueOf([], [restoredItem]));
    outreachQueue.desfazerEnvio.mockResolvedValueOnce(makeOutreachEvent());
    await store.loadOutreachQueue();

    await store.undoOutreach(sentItem);

    expect(outreachQueue.desfazerEnvio).toHaveBeenCalledWith(sentItem);
    expect(store.outreachEnviadosHoje()).toEqual([]);
    expect(store.outreachNovos()).toEqual([restoredItem]);
  });
});

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute({
    id: LeadId.fromString(LEAD_ID),
    googlePlaceId: null,
    businessName: BusinessName.create('Casa da Fada Beauty'),
    sector: Sector.create('Salões & Barbearias'),
    location: Location.create({ city: 'Niterói', address: null }),
    contactInfo: ContactInfo.create({ phone: PhoneNumber.create('(21) 99999-0001') }),
    status: LeadStatus.novo(),
    notes: '',
    rating: 5,
    reviewCount: 91,
    bairro: null,
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    instagramHandle: null,
    websiteQuality: null,
    leadScore: 90,
    openingHours: null,
    topReviews: null,
    previewUrl: null,
    previewViews: 0,
    previewLastViewedAt: null,
    currentStage: null,
    stageSentAt: null,
    nextFollowupAt: null,
    abVariant: null,
    createdAt: new Date('2026-08-11T12:00:00.000Z'),
    ...overrides,
  });
}

function makeQueueItem(overrides: Partial<OutreachQueueItem> = {}): OutreachQueueItem {
  return {
    lead: makeLead(),
    stage: 'm1a_permissao',
    variant: 'A',
    mensagemRenderizada: 'Mensagem pronta',
    whatsappUrl: 'https://wa.me/5521999990001?text=Mensagem%20pronta',
    telefoneInvalido: false,
    bairro: null,
    avaliacoes: 91,
    eventId: null,
    sentAt: null,
    ...overrides,
  };
}

function makeQueueItemForSector(
  id: string,
  sector: string,
  overrides: Partial<OutreachQueueItem> = {},
): OutreachQueueItem {
  return makeQueueItem({
    lead: makeLead({ id: LeadId.fromString(id), sector: Sector.create(sector) }),
    ...overrides,
  });
}

function makeOutreachEvent(): OutreachEvent {
  return {
    id: EVENT_ID,
    leadId: LEAD_ID,
    stage: 'm1a_permissao',
    variant: 'A',
    renderedMessage: 'Mensagem pronta',
    sentAt: new Date('2026-08-11T12:00:00.000Z'),
  };
}

function queueOf(followups: OutreachQueueItem[], novos: OutreachQueueItem[]) {
  return { followups, novos, enviadosHoje: [], contadorHoje: 0 };
}

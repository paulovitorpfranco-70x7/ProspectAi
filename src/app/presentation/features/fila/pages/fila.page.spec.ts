import { TestBed } from '@angular/core/testing';
import {
  OutreachQueueService,
  type OutreachDailyQueue,
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
import { FilaPage } from './fila.page';

const LEAD_ID = '123e4567-e89b-42d3-a456-426614174000';
const EVENT_ID = '123e4567-e89b-42d3-a456-426614174010';

async function setup(initialQueue: OutreachDailyQueue) {
  const outreachQueue = {
    montarFila: jest.fn().mockResolvedValue(initialQueue),
    confirmarEnvio: jest.fn().mockResolvedValue(makeEvent()),
    desfazerEnvio: jest.fn().mockResolvedValue(makeEvent()),
  };
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);

  await TestBed.configureTestingModule({
    imports: [FilaPage],
    providers: [{ provide: OutreachQueueService, useValue: outreachQueue }],
  }).compileComponents();

  const fixture = TestBed.createComponent(FilaPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, outreachQueue, writeText, open };
}

describe('FilaPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should render the daily outreach queue', async () => {
    const { fixture } = await setup(emptyQueue());

    expect(fixture.nativeElement.querySelector('.outreach-queue')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Fila diária de abordagem');
  });

  it('copying should not create an event and confirming should create exactly one', async () => {
    const item = makeQueueItem();
    const { fixture, outreachQueue, writeText, open } = await setup({
      ...emptyQueue(),
      novos: [item],
    });

    findButton(fixture, 'Copiar e abrir WhatsApp').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(item.mensagemRenderizada);
    expect(open).toHaveBeenCalledWith(item.whatsappUrl, '_blank', 'noopener,noreferrer');
    expect(outreachQueue.confirmarEnvio).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('.outreach-card--awaiting-confirmation'),
    ).not.toBeNull();

    findButton(fixture, 'Confirmar envio').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(outreachQueue.confirmarEnvio).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelectorAll('.outreach-card--sent')).toHaveLength(1);
  });

  it('should request confirmation before undoing a sent event', async () => {
    const sentItem = makeQueueItem({
      eventId: EVENT_ID,
      sentAt: new Date('2026-08-11T12:00:00.000Z'),
    });
    const restoredItem = makeQueueItem();
    const { fixture, outreachQueue } = await setup({
      ...emptyQueue(),
      enviadosHoje: [sentItem],
      contadorHoje: 1,
    });
    outreachQueue.montarFila.mockResolvedValueOnce({
      ...emptyQueue(),
      novos: [restoredItem],
    });
    const confirm = jest
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    findButton(fixture, 'Desfazer').click();
    await fixture.whenStable();
    expect(outreachQueue.desfazerEnvio).not.toHaveBeenCalled();

    findButton(fixture, 'Desfazer').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(outreachQueue.desfazerEnvio).toHaveBeenCalledWith(sentItem);
    expect(fixture.nativeElement.querySelector('.outreach-card--sent')).toBeNull();
    expect(findButton(fixture, 'Copiar e abrir WhatsApp')).toBeTruthy();
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

function makeEvent(): OutreachEvent {
  return {
    id: EVENT_ID,
    leadId: LEAD_ID,
    stage: 'm1a_permissao',
    variant: 'A',
    renderedMessage: 'Mensagem pronta',
    sentAt: new Date('2026-08-11T12:00:00.000Z'),
  };
}

function emptyQueue(): OutreachDailyQueue {
  return { followups: [], novos: [], enviadosHoje: [], contadorHoje: 0 };
}

function findButton(fixture: { nativeElement: HTMLElement }, label: string): HTMLButtonElement {
  const button = [...fixture.nativeElement.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Botão não encontrado: ${label}`);
  }

  return button;
}

import { TestBed } from '@angular/core/testing';
import { LEAD_REPOSITORY } from '@application/lead';
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
import type { OutreachRepositoryPort } from '@domain/outreach/outreach.repository';
import type { OutreachEvent } from '@domain/outreach/types';
import { OutreachQueueService, type OutreachQueueItem } from './outreach-queue.service';
import { OUTREACH_REPOSITORY } from './outreach-repository.token';

const IDS = {
  followup: '550e8400-e29b-41d4-a716-446655440001',
  newLead: '550e8400-e29b-41d4-a716-446655440002',
  oddNewLead: '550e8400-e29b-41d4-a716-446655440003',
} as const;

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute({
    id: LeadId.fromString(IDS.newLead),
    googlePlaceId: null,
    businessName: BusinessName.create('Barbearia Central'),
    sector: Sector.create('Salões & Barbearias'),
    location: Location.create({ city: 'Niterói', address: 'Icaraí' }),
    contactInfo: ContactInfo.create({ phone: PhoneNumber.create('(21) 99999-8888') }),
    status: LeadStatus.novo(),
    notes: '',
    rating: 4.8,
    reviewCount: 30,
    bairro: 'Icaraí',
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    instagramHandle: null,
    websiteQuality: null,
    leadScore: 80,
    openingHours: null,
    topReviews: [{ rating: 5 }, { rating: 4 }],
    previewUrl: 'https://preview.example.com/barbearia',
    previewViews: 0,
    previewLastViewedAt: null,
    currentStage: null,
    stageSentAt: null,
    nextFollowupAt: null,
    abVariant: null,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    ...overrides,
  });
}

function makeLeadRepository(): jest.Mocked<LeadRepository> {
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

function makeOutreachRepository(): jest.Mocked<OutreachRepositoryPort> {
  return {
    registrarEnvio: jest.fn(),
    desfazerUltimoEnvio: jest.fn(),
    listarEventosPorLead: jest.fn(),
    listarEventosEntre: jest.fn().mockResolvedValue([]),
    listarFollowupsPendentes: jest.fn().mockResolvedValue([]),
  };
}

function setup() {
  const leadRepository = makeLeadRepository();
  const outreachRepository = makeOutreachRepository();
  TestBed.configureTestingModule({
    providers: [
      OutreachQueueService,
      { provide: LEAD_REPOSITORY, useValue: leadRepository },
      { provide: OUTREACH_REPOSITORY, useValue: outreachRepository },
    ],
  });

  return {
    service: TestBed.inject(OutreachQueueService),
    leadRepository,
    outreachRepository,
  };
}

describe('OutreachQueueService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should place due follow-ups before new leads', async () => {
    const { service, leadRepository, outreachRepository } = setup();
    const followup = makeLead({
      id: LeadId.fromString(IDS.followup),
      currentStage: 'm1a_permissao',
      stageSentAt: new Date('2026-08-01T12:00:00.000Z'),
      nextFollowupAt: new Date('2026-08-03T12:00:00.000Z'),
      abVariant: 'A',
    });
    const newLead = makeLead();
    leadRepository.findAll.mockResolvedValue([followup, newLead]);
    outreachRepository.listarFollowupsPendentes.mockResolvedValue([followup]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.followups.map((item) => item.lead.id.getValue())).toEqual([IDS.followup]);
    expect(queue.novos.map((item) => item.lead.id.getValue())).toEqual([IDS.newLead]);
    expect(queue.followups[0]?.stage).toBe('f1_d2');
  });

  it('should include a lead with next_followup_at in the past in follow-ups', async () => {
    const { service, leadRepository, outreachRepository } = setup();
    const due = makeLead({
      id: LeadId.fromString(IDS.followup),
      status: LeadStatus.contatado(),
      currentStage: 'f1_d2',
      nextFollowupAt: new Date('2026-08-01T12:00:00.000Z'),
    });
    leadRepository.findAll.mockResolvedValue([due]);
    outreachRepository.listarFollowupsPendentes.mockResolvedValue([due]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.followups[0]?.lead.id.getValue()).toBe(IDS.followup);
  });

  it.each([
    ['respondeu', LeadStatus.respondeu()],
    ['proposta', LeadStatus.proposta()],
    ['fechado', LeadStatus.fechado()],
    ['perdido', LeadStatus.perdido()],
  ])(
    'should not include a due lead with terminal status %s in follow-ups',
    async (_status, status) => {
      const { service, leadRepository, outreachRepository } = setup();
      const due = makeLead({
        id: LeadId.fromString(IDS.followup),
        status,
        currentStage: 'f1_d2',
        nextFollowupAt: new Date('2026-08-01T12:00:00.000Z'),
      });
      leadRepository.findAll.mockResolvedValue([due]);
      outreachRepository.listarFollowupsPendentes.mockResolvedValue([]);

      const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

      expect(queue.followups).toEqual([]);
    },
  );

  it('should not show a new lead that was already sent today', async () => {
    const { service, leadRepository, outreachRepository } = setup();
    const lead = makeLead();
    leadRepository.findAll.mockResolvedValue([lead]);
    outreachRepository.listarEventosEntre.mockResolvedValue([
      makeEvent({ leadId: lead.id.getValue() }),
    ]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.novos).toEqual([]);
    expect(queue.contadorHoje).toBe(1);
  });

  it.each([null, '', '   '])(
    'should force variant A for an odd-index lead without a usable preview URL (%p)',
    async (previewUrl) => {
      const { service, leadRepository } = setup();
      const evenLead = makeLead();
      const oddLead = makeLead({
        id: LeadId.fromString(IDS.oddNewLead),
        previewUrl,
        createdAt: new Date('2026-08-02T12:00:00.000Z'),
      });
      leadRepository.findAll.mockResolvedValue([evenLead, oddLead]);

      const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));
      const item = queue.novos.find((candidate) => candidate.lead.id.equals(oddLead.id));

      expect(item?.variant).toBe('A');
      expect(item?.stage).toBe('m1a_permissao');
    },
  );

  it('should allow variant B for an odd-index lead with a preview URL', async () => {
    const { service, leadRepository } = setup();
    const evenLead = makeLead();
    const oddLead = makeLead({
      id: LeadId.fromString(IDS.oddNewLead),
      previewUrl: 'https://preview.example.com/lead-impar',
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
    });
    leadRepository.findAll.mockResolvedValue([evenLead, oddLead]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));
    const item = queue.novos.find((candidate) => candidate.lead.id.equals(oddLead.id));

    expect(item?.variant).toBe('B');
    expect(item?.stage).toBe('m1b_direto');
    expect(item?.mensagemRenderizada).toContain('https://preview.example.com/lead-impar');
  });

  it.each([null, '', '   '])(
    'should force variant A for f1_d2 without a usable preview URL (%p)',
    async (previewUrl) => {
      const { service, leadRepository, outreachRepository } = setup();
      const followup = makeLead({
        id: LeadId.fromString(IDS.followup),
        previewUrl,
        currentStage: 'm1a_permissao',
        stageSentAt: new Date('2026-08-01T12:00:00.000Z'),
        nextFollowupAt: new Date('2026-08-03T12:00:00.000Z'),
        abVariant: 'B',
      });
      leadRepository.findAll.mockResolvedValue([followup]);
      outreachRepository.listarFollowupsPendentes.mockResolvedValue([followup]);

      const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));
      const item = queue.followups[0];

      expect(item).toMatchObject({
        lead: followup,
        stage: 'f1_d2',
        variant: 'A',
        renderError: null,
      });
      expect(item?.mensagemRenderizada).not.toContain('http');
      expect(item?.mensagemRenderizada).toMatch(/\?$/);
    },
  );

  it('should preserve variant B for f1_d2 with a usable preview URL', async () => {
    const { service, leadRepository, outreachRepository } = setup();
    const followup = makeLead({
      id: LeadId.fromString(IDS.followup),
      previewUrl: 'https://preview.example.com/followup',
      currentStage: 'm1a_permissao',
      stageSentAt: new Date('2026-08-01T12:00:00.000Z'),
      nextFollowupAt: new Date('2026-08-03T12:00:00.000Z'),
      abVariant: 'B',
    });
    leadRepository.findAll.mockResolvedValue([followup]);
    outreachRepository.listarFollowupsPendentes.mockResolvedValue([followup]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));
    const item = queue.followups[0];

    expect(item).toMatchObject({ stage: 'f1_d2', variant: 'B', renderError: null });
    expect(item?.mensagemRenderizada).toContain('https://preview.example.com/followup');
    expect(item?.mensagemRenderizada).toMatch(/\?$/);
  });

  it('should isolate a render failure to its lead and keep the remaining queue items', async () => {
    const { service, leadRepository, outreachRepository } = setup();
    const failingSentLead = makeLead({
      id: LeadId.fromString(IDS.followup),
      businessName: BusinessName.create('Lead com erro'),
    });
    const firstValidLead = makeLead();
    const secondValidLead = makeLead({
      id: LeadId.fromString(IDS.oddNewLead),
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    leadRepository.findAll.mockResolvedValue([failingSentLead, firstValidLead, secondValidLead]);
    outreachRepository.listarEventosEntre.mockResolvedValue([
      makeEvent({
        leadId: failingSentLead.id.getValue(),
        stage: 'f1_d2',
        renderedMessage: 'Mensagem com {{preview_url}}',
      }),
    ]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.enviadosHoje).toHaveLength(1);
    expect(queue.enviadosHoje[0]).toMatchObject({
      lead: failingSentLead,
      stage: 'f1_d2',
      renderError: 'O texto renderizado contém tokens não resolvidos',
      mensagemRenderizada: '',
      whatsappUrl: null,
    });
    expect(queue.novos).toHaveLength(2);
    expect(queue.novos.every((item) => item.renderError === null)).toBe(true);
    expect(queue.novos.every((item) => item.mensagemRenderizada.length > 0)).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining(IDS.followup),
      expect.any(Error),
    );
  });

  it('should count a 02:00 UTC event on the previous day in America/Sao_Paulo', async () => {
    const { service, outreachRepository } = setup();
    const event = makeEvent({ sentAt: new Date('2026-08-05T02:00:00.000Z') });
    outreachRepository.listarEventosEntre.mockImplementation(async (inicio, fim) =>
      event.sentAt >= inicio && event.sentAt < fim ? [event] : [],
    );

    const previousDayQueue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));
    const currentDayQueue = await service.montarFila(new Date('2026-08-05T12:00:00.000Z'));

    expect(previousDayQueue.contadorHoje).toBe(1);
    expect(currentDayQueue.contadorHoje).toBe(0);
    expect(outreachRepository.listarEventosEntre).toHaveBeenLastCalledWith(
      new Date('2026-08-05T03:00:00.000Z'),
      new Date('2026-08-06T03:00:00.000Z'),
    );
  });

  it('should keep an invalid-phone lead in the queue without a WhatsApp URL', async () => {
    const { service, leadRepository } = setup();
    const lead = makeLead({
      contactInfo: ContactInfo.create({ email: Email.create('contato@barbearia.com') }),
    });
    leadRepository.findAll.mockResolvedValue([lead]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.novos[0]?.telefoneInvalido).toBe(true);
    expect(queue.novos[0]?.whatsappUrl).toBeNull();
  });

  it('should render the real Google review count when reputation threshold is met', async () => {
    const { service, leadRepository } = setup();
    leadRepository.findAll.mockResolvedValue([makeLead({ rating: 4.8, reviewCount: 210 })]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.novos[0]?.mensagemRenderizada).toContain('4,8 com 210 avaliações');
    expect(queue.novos[0]?.avaliacoes).toBe(210);
  });

  it('should omit reputation copy when review count is below 20', async () => {
    const { service, leadRepository } = setup();
    leadRepository.findAll.mockResolvedValue([makeLead({ rating: 4.8, reviewCount: 4 })]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.novos[0]?.mensagemRenderizada).not.toContain('avaliações');
    expect(queue.novos[0]?.avaliacoes).toBe(4);
  });

  it('should omit reputation copy when review count is null', async () => {
    const { service, leadRepository } = setup();
    leadRepository.findAll.mockResolvedValue([makeLead({ rating: 4.8, reviewCount: null })]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(queue.novos[0]?.mensagemRenderizada).not.toContain('avaliações');
    expect(queue.novos[0]?.avaliacoes).toBeNull();
  });

  it('should use persisted bairro and never derive it from the full address', async () => {
    const { service, leadRepository } = setup();
    const lead = makeLead({ bairro: null });
    leadRepository.findAll.mockResolvedValue([lead]);

    const queue = await service.montarFila(new Date('2026-08-04T12:00:00.000Z'));

    expect(lead.location.getAddress()).toBe('Icaraí');
    expect(queue.novos[0]?.bairro).toBeNull();
  });

  it('should pass the correctly calculated next follow-up when confirming a send', async () => {
    const { service, outreachRepository } = setup();
    const sentAt = new Date('2026-08-04T15:00:00.000Z');
    const item: OutreachQueueItem = {
      lead: makeLead(),
      stage: 'f1_d2',
      variant: 'A',
      renderError: null,
      mensagemRenderizada: 'Mensagem pronta',
      whatsappUrl: 'https://wa.me/5521999998888?text=Mensagem%20pronta',
      telefoneInvalido: false,
      bairro: 'Icaraí',
      avaliacoes: 2,
      eventId: null,
      sentAt: null,
    };
    outreachRepository.registrarEnvio.mockResolvedValue(makeEvent({ stage: 'f1_d2' }));

    await service.confirmarEnvio(item, sentAt);

    expect(outreachRepository.registrarEnvio).toHaveBeenCalledWith({
      leadId: item.lead.id.getValue(),
      stage: 'f1_d2',
      variant: 'A',
      renderedMessage: 'Mensagem pronta',
      nextFollowupAt: new Date('2026-08-07T15:00:00.000Z'),
    });
  });

  it('should undo the event associated with a sent queue item', async () => {
    const { service, outreachRepository } = setup();
    const event = makeEvent();
    const item: OutreachQueueItem = {
      lead: makeLead(),
      stage: event.stage,
      variant: 'A',
      renderError: null,
      mensagemRenderizada: event.renderedMessage,
      whatsappUrl: 'https://wa.me/5521999998888?text=Mensagem%20enviada',
      telefoneInvalido: false,
      bairro: 'Icaraí',
      avaliacoes: 30,
      eventId: event.id,
      sentAt: event.sentAt,
    };
    outreachRepository.desfazerUltimoEnvio.mockResolvedValue(event);

    await service.desfazerEnvio(item);

    expect(outreachRepository.desfazerUltimoEnvio).toHaveBeenCalledWith(
      item.lead.id.getValue(),
      event.id,
    );
  });

  it('should reject undo for a queue item without an event', async () => {
    const { service, outreachRepository } = setup();
    const item: OutreachQueueItem = {
      lead: makeLead(),
      stage: 'm1a_permissao',
      variant: 'A',
      renderError: null,
      mensagemRenderizada: 'Mensagem pronta',
      whatsappUrl: 'https://wa.me/5521999998888?text=Mensagem%20pronta',
      telefoneInvalido: false,
      bairro: 'Icaraí',
      avaliacoes: 30,
      eventId: null,
      sentAt: null,
    };

    await expect(service.desfazerEnvio(item)).rejects.toThrow(
      'não possui evento de outreach associado',
    );
    expect(outreachRepository.desfazerUltimoEnvio).not.toHaveBeenCalled();
  });
});

function makeEvent(overrides: Partial<OutreachEvent> = {}): OutreachEvent {
  return {
    id: '550e8400-e29b-41d4-a716-446655440010',
    leadId: IDS.newLead,
    stage: 'm1a_permissao',
    variant: 'A',
    renderedMessage: 'Mensagem enviada',
    sentAt: new Date('2026-08-04T15:00:00.000Z'),
    ...overrides,
  };
}

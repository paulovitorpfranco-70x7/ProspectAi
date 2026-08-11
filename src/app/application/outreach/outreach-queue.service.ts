import { inject, Injectable } from '@angular/core';
import { LEAD_REPOSITORY } from '@application/lead';
import type { Lead } from '@domain/lead/entities/lead.entity';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { computeNextFollowup, nextStage, pickAbVariant } from '@domain/outreach/machine';
import { buildWhatsappUrl } from '@domain/outreach/phone';
import type { OutreachRepositoryPort } from '@domain/outreach/outreach.repository';
import { assertNoOrphanTokens } from '@domain/outreach/render.guard';
import { renderTemplate } from '@domain/outreach/render';
import { getCadenceTemplate } from '@domain/outreach/templates/cadence.templates';
import type {
  AbVariant,
  LeadOutreachContext,
  OutreachEvent,
  OutreachStage,
} from '@domain/outreach/types';
import { OUTREACH_REPOSITORY } from './outreach-repository.token';

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

export interface OutreachQueueItem {
  readonly lead: Lead;
  readonly stage: OutreachStage;
  readonly variant: AbVariant;
  readonly mensagemRenderizada: string;
  readonly whatsappUrl: string | null;
  readonly telefoneInvalido: boolean;
  readonly bairro: string | null;
  readonly avaliacoes: number | null;
  readonly eventId: string | null;
  readonly sentAt: Date | null;
}

export interface OutreachDailyQueue {
  readonly followups: OutreachQueueItem[];
  readonly novos: OutreachQueueItem[];
  readonly enviadosHoje: OutreachQueueItem[];
  readonly contadorHoje: number;
}

@Injectable({ providedIn: 'root' })
export class OutreachQueueService {
  private readonly leadRepository: LeadRepository = inject(LEAD_REPOSITORY);
  private readonly outreachRepository: OutreachRepositoryPort = inject(OUTREACH_REPOSITORY);

  async montarFila(agora: Date = new Date()): Promise<OutreachDailyQueue> {
    const { inicio, fim } = saoPauloDayBounds(agora);
    const fimDoDia = new Date(fim.getTime() - 1);
    const [allLeads, pendingFollowups, sentToday] = await Promise.all([
      this.leadRepository.findAll({ sortBy: 'createdAt', sortOrder: 'asc' }),
      this.outreachRepository.listarFollowupsPendentes(fimDoDia),
      this.outreachRepository.listarEventosEntre(inicio, fim),
    ]);
    const leads = [...allLeads];
    const sequenceByLeadId = new Map(
      leads.map((lead, index) => [lead.id.getValue(), index] as const),
    );
    const leadById = new Map(leads.map((lead) => [lead.id.getValue(), lead] as const));
    const sentTodayLeadIds = new Set(sentToday.map((event) => event.leadId));

    const followups = pendingFollowups
      .filter((lead) => !sentTodayLeadIds.has(lead.id.getValue()))
      .flatMap((lead) => {
        if (lead.currentStage === null) {
          return [];
        }

        // O repositório exclui status terminais; todo follow-up pendente está sem resposta.
        const stage = nextStage(lead.currentStage, 'sem_resposta');

        if (stage === 'encerrar') {
          return [];
        }

        const sequenceIndex = sequenceByLeadId.get(lead.id.getValue()) ?? 0;
        const variant = lead.abVariant ?? pickAbVariant(sequenceIndex);
        return [this.buildItem(lead, stage, variant)];
      });

    const novos = leads
      .filter((lead) => lead.currentStage === null && !sentTodayLeadIds.has(lead.id.getValue()))
      .sort(
        (left, right) =>
          right.leadScore - left.leadScore || right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .map((lead) => {
        const sequenceIndex = sequenceByLeadId.get(lead.id.getValue()) ?? 0;
        const selectedVariant = pickAbVariant(sequenceIndex);
        const hasPreview = lead.previewUrl !== null && lead.previewUrl.trim().length > 0;
        const variant = selectedVariant === 'B' && !hasPreview ? 'A' : selectedVariant;
        const stage = variant === 'A' ? 'm1a_permissao' : 'm1b_direto';
        return this.buildItem(lead, stage, variant);
      });

    const enviadosHoje = sentToday.flatMap((event) => {
      const lead = leadById.get(event.leadId);

      if (lead === undefined) {
        return [];
      }

      const sequenceIndex = sequenceByLeadId.get(event.leadId) ?? 0;
      const variant = event.variant ?? lead.abVariant ?? pickAbVariant(sequenceIndex);
      return [this.buildItem(lead, event.stage, variant, event)];
    });

    return {
      followups,
      novos,
      enviadosHoje,
      contadorHoje: sentToday.length,
    };
  }

  async confirmarEnvio(
    item: OutreachQueueItem,
    enviadoEm: Date = new Date(),
  ): Promise<OutreachEvent> {
    return this.outreachRepository.registrarEnvio({
      leadId: item.lead.id.getValue(),
      stage: item.stage,
      variant: item.variant,
      renderedMessage: item.mensagemRenderizada,
      nextFollowupAt: computeNextFollowup(item.stage, enviadoEm),
    });
  }

  async desfazerEnvio(item: OutreachQueueItem): Promise<OutreachEvent> {
    if (item.eventId === null) {
      throw new Error('O item enviado não possui evento de outreach associado');
    }

    return this.outreachRepository.desfazerUltimoEnvio(item.lead.id.getValue(), item.eventId);
  }

  private buildItem(
    lead: Lead,
    stage: OutreachStage,
    variant: AbVariant,
    event?: OutreachEvent,
  ): OutreachQueueItem {
    const bairro = lead.bairro;
    const avaliacoes = lead.reviewCount;
    const context: LeadOutreachContext = {
      nome: lead.businessName.getValue(),
      cidade: lead.location.getCity(),
      bairro,
      setor: lead.sector.getValue(),
      nota: lead.rating,
      avaliacoes,
      previewUrl: lead.previewUrl,
      primeiroNome: null,
    };
    const mensagemRenderizada =
      event?.renderedMessage ??
      renderTemplate(getCadenceTemplate(stage, lead.id.getValue()), context, stage);

    if (event !== undefined) {
      assertNoOrphanTokens(mensagemRenderizada);
    }
    const phone = lead.contactInfo.getPhone()?.getValue() ?? '';
    const whatsappUrl = buildWhatsappUrl(phone, mensagemRenderizada);

    return {
      lead,
      stage,
      variant,
      mensagemRenderizada,
      whatsappUrl,
      telefoneInvalido: whatsappUrl === null,
      bairro,
      avaliacoes,
      eventId: event?.id ?? null,
      sentAt: event?.sentAt ?? null,
    };
  }
}

function saoPauloDayBounds(date: Date): { inicio: Date; fim: Date } {
  const parts = datePartsInTimeZone(date, SAO_PAULO_TIME_ZONE);
  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));

  return {
    inicio: zonedMidnightUtc(parts.year, parts.month, parts.day, SAO_PAULO_TIME_ZONE),
    fim: zonedMidnightUtc(
      nextDate.getUTCFullYear(),
      nextDate.getUTCMonth() + 1,
      nextDate.getUTCDate(),
      SAO_PAULO_TIME_ZONE,
    ),
  };
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);
  let utcTimestamp = localMidnightAsUtc;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    const offset = timeZoneOffsetMs(new Date(utcTimestamp), timeZone);
    utcTimestamp = localMidnightAsUtc - offset;
  }

  return new Date(utcTimestamp);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = dateTimePartsInTimeZone(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.floor(date.getTime() / 1_000) * 1_000;
}

function datePartsInTimeZone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = dateTimePartsInTimeZone(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function dateTimePartsInTimeZone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values['year'] ?? 0,
    month: values['month'] ?? 0,
    day: values['day'] ?? 0,
    hour: values['hour'] ?? 0,
    minute: values['minute'] ?? 0,
    second: values['second'] ?? 0,
  };
}

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  DeleteLeadUseCase,
  LEAD_REPOSITORY,
  LeadMapper,
  type LeadDto,
  SendEmailUseCase,
  SendWhatsAppUseCase,
  UpdateLeadStatusUseCase,
} from '@application/lead';
import {
  OutreachQueueService,
  type OutreachQueueItem,
} from '@application/outreach/outreach-queue.service';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import type { SectorValue } from '@domain/lead/value-objects/sector.vo';
import type { LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';

export type PipelineFilterStatus = LeadStatusValue | 'all';
export type PipelineSortBy =
  | 'leadScore'
  | 'createdAt'
  | 'rating'
  | 'contactCount'
  | 'lastContactAt';

export interface PipelineState {
  readonly leads: LeadDto[];
  readonly filterStatus: PipelineFilterStatus;
  readonly searchQuery: string;
  readonly sortBy: PipelineSortBy;
  readonly loading: boolean;
  readonly error: string | null;
  readonly outreachFollowups: OutreachQueueItem[];
  readonly outreachNovos: OutreachQueueItem[];
  readonly outreachEnviadosHoje: OutreachQueueItem[];
  readonly setorFilaSelecionado: SectorValue | null;
  readonly outreachLoading: boolean;
  readonly dailySentCount: number;
  readonly dailyLimit: number;
}

export interface OutreachQueueSection {
  readonly key: 'followups' | 'novos';
  readonly label: string;
  readonly items: OutreachQueueItem[];
}

export interface OutreachQueueSectorCount {
  readonly sector: SectorValue;
  readonly count: number;
}

export interface PipelineStatsByStatus {
  readonly total: number;
  readonly novo: number;
  readonly contatado: number;
  readonly respondeu: number;
  readonly preview_enviado: number;
  readonly proposta: number;
  readonly fechado: number;
  readonly perdido: number;
}

const initialState: PipelineState = {
  leads: [],
  filterStatus: 'all',
  searchQuery: '',
  sortBy: 'leadScore',
  loading: false,
  error: null,
  outreachFollowups: [],
  outreachNovos: [],
  outreachEnviadosHoje: [],
  setorFilaSelecionado: null,
  outreachLoading: false,
  dailySentCount: 0,
  dailyLimit: 15,
};

const STATUS_VALUES: readonly LeadStatusValue[] = [
  'novo',
  'contatado',
  'respondeu',
  'preview_enviado',
  'proposta',
  'fechado',
  'perdido',
];

export const PipelineStore = signalStore(
  withState(initialState),
  withComputed(
    ({
      leads,
      filterStatus,
      searchQuery,
      sortBy,
      outreachFollowups,
      outreachNovos,
      setorFilaSelecionado,
      dailySentCount,
      dailyLimit,
    }) => {
      const outreachFollowupsFiltrados = computed(() =>
        filterQueueBySector(outreachFollowups(), setorFilaSelecionado()),
      );
      const outreachNovosFiltrados = computed(() =>
        filterQueueBySector(outreachNovos(), setorFilaSelecionado()),
      );

      return {
        filteredLeads: computed(() => {
          const normalizedQuery = searchQuery().trim().toLowerCase();
          const filtered = leads().filter((lead) => {
            const matchesStatus = filterStatus() === 'all' || lead.status === filterStatus();
            const matchesQuery =
              normalizedQuery.length === 0 ||
              lead.businessName.toLowerCase().includes(normalizedQuery) ||
              lead.city.toLowerCase().includes(normalizedQuery) ||
              lead.sector.toLowerCase().includes(normalizedQuery);

            return matchesStatus && matchesQuery;
          });

          return [...filtered].sort((left, right) => compareLeads(left, right, sortBy()));
        }),

        statsByStatus: computed(() => {
          const stats: PipelineStatsByStatus = {
            total: leads().length,
            novo: 0,
            contatado: 0,
            respondeu: 0,
            preview_enviado: 0,
            proposta: 0,
            fechado: 0,
            perdido: 0,
          };

          return leads().reduce(
            (accumulator, lead) => ({
              ...accumulator,
              [lead.status]: accumulator[lead.status] + 1,
            }),
            stats,
          );
        }),
        outreachFollowupsFiltrados,
        outreachNovosFiltrados,
        setoresFila: computed(() => countQueueItemsBySector(outreachFollowups(), outreachNovos())),
        outreachQueueTotal: computed(() => outreachFollowups().length + outreachNovos().length),
        outreachQueueSections: computed<OutreachQueueSection[]>(() => [
          { key: 'followups', label: 'Follow-ups', items: outreachFollowupsFiltrados() },
          { key: 'novos', label: 'Novos contatos', items: outreachNovosFiltrados() },
        ]),
        dailyLimitReached: computed(() => dailySentCount() >= dailyLimit()),
      };
    },
  ),
  withMethods(
    (
      store,
      leadRepository: LeadRepository = inject(LEAD_REPOSITORY),
      updateLeadStatusUseCase = inject(UpdateLeadStatusUseCase),
      deleteLeadUseCase = inject(DeleteLeadUseCase),
      sendWhatsAppUseCase = inject(SendWhatsAppUseCase),
      sendEmailUseCase = inject(SendEmailUseCase),
      outreachQueueService = inject(OutreachQueueService),
    ) => ({
      async loadLeads(): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const leads = await leadRepository.findAll({ sortBy: 'createdAt', sortOrder: 'desc' });
          patchState(store, {
            leads: leads.map((lead) => LeadMapper.toDto(lead)),
            loading: false,
            error: null,
          });
        } catch (error) {
          patchState(store, { loading: false, error: getErrorMessage(error) });
        }
      },

      async updateStatus(leadId: string, newStatus: string): Promise<void> {
        patchState(store, { error: null });

        try {
          const output = await updateLeadStatusUseCase.execute({ leadId, newStatus });
          patchState(store, { leads: replaceLead(store.leads(), output.lead), error: null });
        } catch (error) {
          patchState(store, { error: getErrorMessage(error) });
        }
      },

      async deleteLead(leadId: string): Promise<void> {
        patchState(store, { error: null });

        try {
          await deleteLeadUseCase.execute({ leadId });
          patchState(store, {
            leads: store.leads().filter((lead) => lead.id !== leadId),
            error: null,
          });
        } catch (error) {
          patchState(store, { error: getErrorMessage(error) });
        }
      },

      async sendWhatsApp(leadId: string): Promise<void> {
        patchState(store, { error: null });

        try {
          const output = await sendWhatsAppUseCase.execute({ leadId });
          patchState(store, { leads: replaceLead(store.leads(), output.lead), error: null });
        } catch (error) {
          patchState(store, { error: getErrorMessage(error) });
        }
      },

      async sendEmail(leadId: string): Promise<void> {
        patchState(store, { error: null });

        try {
          const output = await sendEmailUseCase.execute({ leadId });
          patchState(store, { leads: replaceLead(store.leads(), output.lead), error: null });
        } catch (error) {
          patchState(store, { error: getErrorMessage(error) });
        }
      },

      async loadOutreachQueue(): Promise<void> {
        patchState(store, { outreachLoading: true, error: null });

        try {
          const queue = await outreachQueueService.montarFila();
          patchState(store, {
            outreachFollowups: queue.followups,
            outreachNovos: queue.novos,
            outreachEnviadosHoje: queue.enviadosHoje,
            dailySentCount: queue.contadorHoje,
            outreachLoading: false,
            error: null,
          });
        } catch (error) {
          patchState(store, { outreachLoading: false, error: getErrorMessage(error) });
        }
      },

      async confirmOutreach(item: OutreachQueueItem): Promise<void> {
        patchState(store, { error: null });

        try {
          await outreachQueueService.confirmarEnvio(item);
          patchState(store, {
            outreachFollowups: removeQueueItem(store.outreachFollowups(), item),
            outreachNovos: removeQueueItem(store.outreachNovos(), item),
            outreachEnviadosHoje: [item, ...store.outreachEnviadosHoje()],
            dailySentCount: store.dailySentCount() + 1,
            error: null,
          });
        } catch (error) {
          patchState(store, { error: getErrorMessage(error) });
          throw error;
        }
      },

      setFilter(status: PipelineFilterStatus): void {
        patchState(store, { filterStatus: status });
      },

      setSearchQuery(query: string): void {
        patchState(store, { searchQuery: query });
      },

      setSortBy(field: string): void {
        if (isPipelineSortBy(field)) {
          patchState(store, { sortBy: field });
        }
      },

      setDailyLimit(value: string): void {
        const parsed = Number.parseInt(value, 10);

        if (Number.isInteger(parsed) && parsed > 0) {
          patchState(store, { dailyLimit: parsed });
        }
      },

      selecionarSetorFila(setor: SectorValue | null): void {
        patchState(store, {
          setorFilaSelecionado: store.setorFilaSelecionado() === setor ? null : setor,
        });
      },
    }),
  ),
);

function filterQueueBySector(
  items: readonly OutreachQueueItem[],
  sector: SectorValue | null,
): OutreachQueueItem[] {
  return sector === null
    ? [...items]
    : items.filter((item) => item.lead.sector.getValue() === sector);
}

function countQueueItemsBySector(
  followups: readonly OutreachQueueItem[],
  novos: readonly OutreachQueueItem[],
): OutreachQueueSectorCount[] {
  const counts = new Map<SectorValue, number>();

  for (const item of [...followups, ...novos]) {
    const sector = item.lead.sector.getValue();
    counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((left, right) => right.count - left.count || left.sector.localeCompare(right.sector));
}

function replaceLead(leads: readonly LeadDto[], updatedLead: LeadDto): LeadDto[] {
  return leads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead));
}

function removeQueueItem(
  items: readonly OutreachQueueItem[],
  removed: OutreachQueueItem,
): OutreachQueueItem[] {
  return items.filter(
    (item) =>
      item.lead.id.getValue() !== removed.lead.id.getValue() || item.stage !== removed.stage,
  );
}

function compareLeads(left: LeadDto, right: LeadDto, sortBy: PipelineSortBy): number {
  switch (sortBy) {
    case 'leadScore': {
      const scoreDifference = right.leadScore - left.leadScore;

      return scoreDifference !== 0
        ? scoreDifference
        : dateValue(right.createdAtIso) - dateValue(left.createdAtIso);
    }
    case 'rating':
      return (right.rating ?? -1) - (left.rating ?? -1);
    case 'contactCount':
      return right.contactCount - left.contactCount;
    case 'lastContactAt':
      return dateValue(right.lastContactAtIso) - dateValue(left.lastContactAtIso);
    case 'createdAt':
      return dateValue(right.createdAtIso) - dateValue(left.createdAtIso);
  }
}

function dateValue(value: string | null): number {
  return value === null ? 0 : new Date(value).getTime();
}

function isPipelineSortBy(field: string): field is PipelineSortBy {
  return ['leadScore', 'createdAt', 'rating', 'contactCount', 'lastContactAt'].includes(field);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro ao executar operação.';
}

export function isLeadStatusValue(value: string): value is LeadStatusValue {
  return STATUS_VALUES.includes(value as LeadStatusValue);
}

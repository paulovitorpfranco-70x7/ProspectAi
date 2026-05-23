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
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import type { LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';

export type PipelineFilterStatus = LeadStatusValue | 'all';
export type PipelineSortBy = 'createdAt' | 'rating' | 'contactCount' | 'lastContactAt';

export interface PipelineState {
  readonly leads: LeadDto[];
  readonly filterStatus: PipelineFilterStatus;
  readonly searchQuery: string;
  readonly sortBy: PipelineSortBy;
  readonly loading: boolean;
  readonly error: string | null;
}

export interface PipelineStatsByStatus {
  readonly total: number;
  readonly novo: number;
  readonly contatado: number;
  readonly proposta: number;
  readonly fechado: number;
  readonly descartado: number;
}

const initialState: PipelineState = {
  leads: [],
  filterStatus: 'all',
  searchQuery: '',
  sortBy: 'createdAt',
  loading: false,
  error: null,
};

const STATUS_VALUES: readonly LeadStatusValue[] = [
  'novo',
  'contatado',
  'proposta',
  'fechado',
  'descartado',
];

export const PipelineStore = signalStore(
  withState(initialState),
  withComputed(({ leads, filterStatus, searchQuery, sortBy }) => ({
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
        proposta: 0,
        fechado: 0,
        descartado: 0,
      };

      return leads().reduce(
        (accumulator, lead) => ({
          ...accumulator,
          [lead.status]: accumulator[lead.status] + 1,
        }),
        stats,
      );
    }),
  })),
  withMethods(
    (
      store,
      leadRepository: LeadRepository = inject(LEAD_REPOSITORY),
      updateLeadStatusUseCase = inject(UpdateLeadStatusUseCase),
      deleteLeadUseCase = inject(DeleteLeadUseCase),
      sendWhatsAppUseCase = inject(SendWhatsAppUseCase),
      sendEmailUseCase = inject(SendEmailUseCase),
    ) => ({
      async loadLeads(): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const leads = await leadRepository.findAll({ sortBy: store.sortBy(), sortOrder: 'desc' });
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
    }),
  ),
);

function replaceLead(leads: readonly LeadDto[], updatedLead: LeadDto): LeadDto[] {
  return leads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead));
}

function compareLeads(left: LeadDto, right: LeadDto, sortBy: PipelineSortBy): number {
  switch (sortBy) {
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
  return ['createdAt', 'rating', 'contactCount', 'lastContactAt'].includes(field);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro ao executar operação.';
}

export function isLeadStatusValue(value: string): value is LeadStatusValue {
  return STATUS_VALUES.includes(value as LeadStatusValue);
}

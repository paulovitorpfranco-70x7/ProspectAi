import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  OutreachQueueService,
  type OutreachQueueItem,
} from '@application/outreach/outreach-queue.service';
import type { SectorValue } from '@domain/lead/value-objects/sector.vo';

export interface FilaState {
  readonly outreachFollowups: OutreachQueueItem[];
  readonly outreachNovos: OutreachQueueItem[];
  readonly outreachEnviadosHoje: OutreachQueueItem[];
  readonly outreachAwaitingConfirmationKeys: string[];
  readonly outreachConfirmingKeys: string[];
  readonly outreachUndoingEventIds: string[];
  readonly setorFilaSelecionado: SectorValue | null;
  readonly outreachLoading: boolean;
  readonly dailySentCount: number;
  readonly dailyLimit: number;
  readonly error: string | null;
}

export interface FilaSection {
  readonly key: 'followups' | 'novos';
  readonly label: string;
  readonly items: OutreachQueueItem[];
}

export interface FilaSectorCount {
  readonly sector: SectorValue;
  readonly count: number;
}

const initialState: FilaState = {
  outreachFollowups: [],
  outreachNovos: [],
  outreachEnviadosHoje: [],
  outreachAwaitingConfirmationKeys: [],
  outreachConfirmingKeys: [],
  outreachUndoingEventIds: [],
  setorFilaSelecionado: null,
  outreachLoading: false,
  dailySentCount: 0,
  dailyLimit: 15,
  error: null,
};

export const FilaStore = signalStore(
  withState(initialState),
  withComputed(
    ({ outreachFollowups, outreachNovos, setorFilaSelecionado, dailySentCount, dailyLimit }) => {
      const outreachFollowupsFiltrados = computed(() =>
        filterQueueBySector(outreachFollowups(), setorFilaSelecionado()),
      );
      const outreachNovosFiltrados = computed(() =>
        filterQueueBySector(outreachNovos(), setorFilaSelecionado()),
      );

      return {
        outreachFollowupsFiltrados,
        outreachNovosFiltrados,
        setoresFila: computed(() => countQueueItemsBySector(outreachFollowups(), outreachNovos())),
        outreachQueueTotal: computed(() => outreachFollowups().length + outreachNovos().length),
        outreachQueueSections: computed<FilaSection[]>(() => [
          { key: 'followups', label: 'Follow-ups', items: outreachFollowupsFiltrados() },
          { key: 'novos', label: 'Novos contatos', items: outreachNovosFiltrados() },
        ]),
        dailyLimitReached: computed(() => dailySentCount() >= dailyLimit()),
      };
    },
  ),
  withMethods((store, outreachQueueService = inject(OutreachQueueService)) => ({
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
      const itemKey = outreachQueueItemKey(item);

      if (store.outreachConfirmingKeys().includes(itemKey)) {
        return;
      }

      patchState(store, {
        outreachConfirmingKeys: [...store.outreachConfirmingKeys(), itemKey],
        error: null,
      });

      try {
        const event = await outreachQueueService.confirmarEnvio(item);
        const sentItem: OutreachQueueItem = {
          ...item,
          eventId: event.id,
          sentAt: event.sentAt,
        };
        patchState(store, {
          outreachFollowups: removeQueueItem(store.outreachFollowups(), item),
          outreachNovos: removeQueueItem(store.outreachNovos(), item),
          outreachEnviadosHoje: [sentItem, ...store.outreachEnviadosHoje()],
          outreachAwaitingConfirmationKeys: store
            .outreachAwaitingConfirmationKeys()
            .filter((key) => key !== itemKey),
          outreachConfirmingKeys: store.outreachConfirmingKeys().filter((key) => key !== itemKey),
          dailySentCount: store.dailySentCount() + 1,
          error: null,
        });
      } catch (error) {
        patchState(store, {
          outreachConfirmingKeys: store.outreachConfirmingKeys().filter((key) => key !== itemKey),
          error: getErrorMessage(error),
        });
        throw error;
      }
    },

    async undoOutreach(item: OutreachQueueItem): Promise<void> {
      if (item.eventId === null || store.outreachUndoingEventIds().includes(item.eventId)) {
        return;
      }

      patchState(store, {
        outreachUndoingEventIds: [...store.outreachUndoingEventIds(), item.eventId],
        error: null,
      });

      try {
        await outreachQueueService.desfazerEnvio(item);
        const queue = await outreachQueueService.montarFila();
        patchState(store, {
          outreachFollowups: queue.followups,
          outreachNovos: queue.novos,
          outreachEnviadosHoje: queue.enviadosHoje,
          dailySentCount: queue.contadorHoje,
          outreachUndoingEventIds: store
            .outreachUndoingEventIds()
            .filter((eventId) => eventId !== item.eventId),
          error: null,
        });
      } catch (error) {
        patchState(store, {
          outreachUndoingEventIds: store
            .outreachUndoingEventIds()
            .filter((eventId) => eventId !== item.eventId),
          error: getErrorMessage(error),
        });
        throw error;
      }
    },

    markOutreachAwaitingConfirmation(item: OutreachQueueItem): void {
      const itemKey = outreachQueueItemKey(item);

      if (!store.outreachAwaitingConfirmationKeys().includes(itemKey)) {
        patchState(store, {
          outreachAwaitingConfirmationKeys: [...store.outreachAwaitingConfirmationKeys(), itemKey],
        });
      }
    },

    discardOutreachConfirmation(item: OutreachQueueItem): void {
      const itemKey = outreachQueueItemKey(item);
      patchState(store, {
        outreachAwaitingConfirmationKeys: store
          .outreachAwaitingConfirmationKeys()
          .filter((key) => key !== itemKey),
      });
    },

    isOutreachAwaitingConfirmation(item: OutreachQueueItem): boolean {
      return store.outreachAwaitingConfirmationKeys().includes(outreachQueueItemKey(item));
    },

    isOutreachConfirming(item: OutreachQueueItem): boolean {
      return store.outreachConfirmingKeys().includes(outreachQueueItemKey(item));
    },

    isOutreachUndoing(item: OutreachQueueItem): boolean {
      return item.eventId !== null && store.outreachUndoingEventIds().includes(item.eventId);
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
  })),
);

function filterQueueBySector(
  items: readonly OutreachQueueItem[],
  sector: SectorValue | null,
): OutreachQueueItem[] {
  return sector === null
    ? [...items]
    : items.filter((item) => item.lead.sector.getValue() === sector);
}

function outreachQueueItemKey(item: OutreachQueueItem): string {
  return `${item.lead.id.getValue()}:${item.stage}`;
}

function countQueueItemsBySector(
  followups: readonly OutreachQueueItem[],
  novos: readonly OutreachQueueItem[],
): FilaSectorCount[] {
  const counts = new Map<SectorValue, number>();

  for (const item of [...followups, ...novos]) {
    const sector = item.lead.sector.getValue();
    counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((left, right) => right.count - left.count || left.sector.localeCompare(right.sector));
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Erro ao executar operação.';
}

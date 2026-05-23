import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  SearchLeadsUseCase,
  type SearchLeadsResultItem,
} from '@application/lead';

export interface SearchState {
  readonly results: SearchLeadsResultItem[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly selectedSector: string | null;
  readonly city: string;
}

const initialState: SearchState = {
  results: [],
  loading: false,
  error: null,
  selectedSector: null,
  city: '',
};

export const SearchStore = signalStore(
  withState(initialState),
  withComputed(({ results }) => ({
    hasResults: computed(() => results().length > 0),
  })),
  withMethods((store, searchLeadsUseCase = inject(SearchLeadsUseCase)) => ({
    setSelectedSector(sector: string | null): void {
      patchState(store, { selectedSector: sector });
    },

    setCity(city: string): void {
      patchState(store, { city });
    },

    async executeSearch(): Promise<void> {
      const selectedSector = store.selectedSector();
      const city = store.city().trim();

      if (selectedSector === null || city.length === 0) {
        patchState(store, {
          loading: false,
          error: 'Informe setor e cidade para buscar leads.',
        });
        return;
      }

      patchState(store, { loading: true, error: null });

      try {
        const output = await searchLeadsUseCase.execute({ sector: selectedSector, city });
        patchState(store, {
          results: [...output.items],
          loading: false,
          error: null,
        });
      } catch (error) {
        patchState(store, {
          loading: false,
          error: error instanceof Error ? error.message : 'Erro ao buscar leads.',
        });
      }
    },
  })),
);

import { TestBed } from '@angular/core/testing';
import { SearchLeadsUseCase, type SearchLeadsOutput } from '@application/lead';
import { SearchStore } from './search.store';

function makeOutput(items: SearchLeadsOutput['items'] = []): SearchLeadsOutput {
  return {
    totalFound: items.length,
    addedCount: items.filter((item) => item.itemStatus === 'added').length,
    skippedDuplicates: 0,
    skippedInvalid: 0,
    skippedWithWebsite: 0,
    items,
  };
}

function setup(execute = jest.fn<Promise<SearchLeadsOutput>, Parameters<SearchLeadsUseCase['execute']>>()) {
  TestBed.configureTestingModule({
    providers: [
      SearchStore,
      {
        provide: SearchLeadsUseCase,
        useValue: { execute },
      },
    ],
  });

  return {
    store: TestBed.inject(SearchStore),
    execute,
  };
}

describe('SearchStore', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should start with empty results and loading=false', () => {
    const { store } = setup();

    expect(store.results()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.hasResults()).toBe(false);
  });

  it('should set loading=true when search starts', async () => {
    let resolveSearch!: (output: SearchLeadsOutput) => void;
    const execute = jest.fn(
      () =>
        new Promise<SearchLeadsOutput>((resolve) => {
          resolveSearch = resolve;
        }),
    );
    const { store } = setup(execute);
    store.setSelectedSector('Clínicas & Consultórios');
    store.setCity('Niterói');

    const pendingSearch = store.executeSearch();

    expect(store.loading()).toBe(true);
    resolveSearch(makeOutput());
    await pendingSearch;
  });

  it('should populate results when search completes', async () => {
    const item = {
      itemStatus: 'skipped_has_website' as const,
      placeName: 'Acme Clinic',
      lead: null,
      skipReason: 'HAS_WEBSITE',
    };
    const { store, execute } = setup(jest.fn().mockResolvedValue(makeOutput([item])));
    store.setSelectedSector('Clínicas & Consultórios');
    store.setCity('Niterói');

    await store.executeSearch();

    expect(execute).toHaveBeenCalledWith({ sector: 'Clínicas & Consultórios', city: 'Niterói' });
    expect(store.results()).toEqual([item]);
    expect(store.hasResults()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should set error when use case throws', async () => {
    const { store } = setup(jest.fn().mockRejectedValue(new Error('Falha no Google Places')));
    store.setSelectedSector('Clínicas & Consultórios');
    store.setCity('Niterói');

    await store.executeSearch();

    expect(store.error()).toBe('Falha no Google Places');
    expect(store.loading()).toBe(false);
  });

  it('should clear error on new search', async () => {
    const { store } = setup(jest.fn().mockResolvedValue(makeOutput()));
    store.setSelectedSector('Clínicas & Consultórios');
    store.setCity('Niterói');

    await store.executeSearch();

    expect(store.error()).toBeNull();
  });
});

import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import type {
  PlaceFinderResult,
  PlaceFinderService,
} from '@domain/lead/services/place-finder.service';
import { PlaceFinderUnavailableError } from '@domain/lead/errors/place-finder-unavailable.error';
import { SectorInvalidError } from '@domain/lead/errors/sector-invalid.error';
import { SearchLeadsUseCase } from './search-leads.use-case';

function makePlace(overrides: Partial<PlaceFinderResult> = {}): PlaceFinderResult {
  return {
    name: 'Acme Clinic',
    phone: '(21) 99999-0001',
    email: 'contato@acme.com',
    rating: 4.5,
    address: 'Rua A, 123',
    hasWebsite: false,
    ...overrides,
  };
}

function makeRepositoryMock(): jest.Mocked<LeadRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    existsByPhoneAndCity: jest.fn().mockResolvedValue(false),
    delete: jest.fn(),
    count: jest.fn(),
    statsByStatus: jest.fn(),
  };
}

function makePlaceFinderMock(
  results: readonly PlaceFinderResult[] = [],
): jest.Mocked<PlaceFinderService> {
  return {
    search: jest.fn().mockResolvedValue(results),
  };
}

describe('SearchLeadsUseCase', () => {
  it('should call placeFinder.search with sector and city from input', async () => {
    const repository = makeRepositoryMock();
    const placeFinder = makePlaceFinderMock([]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(placeFinder.search).toHaveBeenCalledWith({
      sector: expect.objectContaining({}),
      city: 'Niterói',
    });
    expect(placeFinder.search.mock.calls[0]?.[0].sector.getValue()).toBe(
      'Clínicas & Consultórios',
    );
  });

  it('should throw SectorInvalidError when input.sector is not canonical', async () => {
    const repository = makeRepositoryMock();
    const placeFinder = makePlaceFinderMock([]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    await expect(useCase.execute({ sector: 'invalid', city: 'Niterói' })).rejects.toBeInstanceOf(
      SectorInvalidError,
    );
    expect(placeFinder.search).not.toHaveBeenCalled();
  });

  it('should propagate PlaceFinderUnavailableError from placeFinder', async () => {
    const repository = makeRepositoryMock();
    const placeFinder = makePlaceFinderMock([]);
    const error = new PlaceFinderUnavailableError('timeout');
    placeFinder.search.mockRejectedValueOnce(error);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    await expect(
      useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' }),
    ).rejects.toBe(error);
  });

  it("should skip places with hasWebsite=true and return itemStatus='skipped_has_website'", async () => {
    const repository = makeRepositoryMock();
    const placeFinder = makePlaceFinderMock([makePlace({ hasWebsite: true })]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    const output = await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(output.items[0]).toMatchObject({
      itemStatus: 'skipped_has_website',
      placeName: 'Acme Clinic',
      lead: null,
      skipReason: 'HAS_WEBSITE',
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("should skip places that match existsByPhoneAndCity and return itemStatus='skipped_duplicate'", async () => {
    const repository = makeRepositoryMock();
    repository.existsByPhoneAndCity.mockResolvedValueOnce(true);
    const placeFinder = makePlaceFinderMock([makePlace()]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    const output = await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(repository.existsByPhoneAndCity).toHaveBeenCalledWith(
      expect.objectContaining({}),
      'Niterói',
    );
    expect(repository.existsByPhoneAndCity.mock.calls[0]?.[0].getValue()).toBe('21999990001');
    expect(output.items[0]).toMatchObject({
      itemStatus: 'skipped_duplicate',
      lead: null,
      skipReason: 'DUPLICATE',
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("should skip places with invalid phone and return itemStatus='skipped_invalid' with reason", async () => {
    const repository = makeRepositoryMock();
    const placeFinder = makePlaceFinderMock([makePlace({ phone: '123456789' })]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    const output = await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(output.items[0]?.itemStatus).toBe('skipped_invalid');
    expect(output.items[0]?.lead).toBeNull();
    expect(output.items[0]?.skipReason).toContain('Telefone inválido');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should call leadRepository.save once per added lead', async () => {
    const repository = makeRepositoryMock();
    const placeFinder = makePlaceFinderMock([
      makePlace({ name: 'Acme Clinic', phone: '(21) 99999-0001' }),
      makePlace({ name: 'Beta Clinic', phone: '(21) 99999-0002' }),
    ]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('should return correct counters in output', async () => {
    const repository = makeRepositoryMock();
    repository.existsByPhoneAndCity.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const placeFinder = makePlaceFinderMock([
      makePlace({ name: 'Added', phone: '(21) 99999-0001' }),
      makePlace({ name: 'Website', hasWebsite: true }),
      makePlace({ name: 'Duplicate', phone: '(21) 99999-0002' }),
      makePlace({ name: 'Invalid', phone: 'abc' }),
    ]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    const output = await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(output).toMatchObject({
      totalFound: 4,
      addedCount: 1,
      skippedDuplicates: 1,
      skippedInvalid: 1,
      skippedWithWebsite: 1,
    });
    expect(output.items).toHaveLength(4);
  });

  it('should return empty items array when placeFinder returns empty', async () => {
    const repository = makeRepositoryMock();
    const placeFinder = makePlaceFinderMock([]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    const output = await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(output.items).toEqual([]);
    expect(output.totalFound).toBe(0);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should return totalFound matching placeFinder length regardless of skips', async () => {
    const repository = makeRepositoryMock();
    repository.existsByPhoneAndCity.mockResolvedValueOnce(true);
    const placeFinder = makePlaceFinderMock([
      makePlace({ name: 'Website', hasWebsite: true }),
      makePlace({ name: 'Duplicate' }),
      makePlace({ name: 'Invalid', phone: 'abc' }),
    ]);
    const useCase = new SearchLeadsUseCase(repository, placeFinder);

    const output = await useCase.execute({ sector: 'Clínicas & Consultórios', city: 'Niterói' });

    expect(output.totalFound).toBe(3);
    expect(output.addedCount).toBe(0);
  });
});

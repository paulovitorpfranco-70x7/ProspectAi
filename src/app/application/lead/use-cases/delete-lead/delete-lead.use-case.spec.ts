import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { DeleteLeadUseCase } from './delete-lead.use-case';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';
const NOW = new Date('2026-05-18T12:00:00.000Z');

function makeRepositoryMock(): jest.Mocked<LeadRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    existsByPhoneAndCity: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    count: jest.fn(),
    statsByStatus: jest.fn(),
  };
}

describe('DeleteLeadUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call repository.delete with the LeadId', async () => {
    const repository = makeRepositoryMock();
    const useCase = new DeleteLeadUseCase(repository);

    await useCase.execute({ leadId: LEAD_ID });

    expect(repository.delete).toHaveBeenCalledTimes(1);
    expect(repository.delete.mock.calls[0]?.[0].getValue()).toBe(LEAD_ID);
  });

  it('should throw LeadNotFoundError when repository.delete throws', async () => {
    const repository = makeRepositoryMock();
    const error = new LeadNotFoundError(LEAD_ID);
    repository.delete.mockRejectedValueOnce(error);
    const useCase = new DeleteLeadUseCase(repository);

    await expect(useCase.execute({ leadId: LEAD_ID })).rejects.toBe(error);
  });

  it('should return leadId and deletedAtIso', async () => {
    const repository = makeRepositoryMock();
    const useCase = new DeleteLeadUseCase(repository);

    const output = await useCase.execute({ leadId: LEAD_ID });

    expect(output).toEqual({
      leadId: LEAD_ID,
      deletedAtIso: '2026-05-18T12:00:00.000Z',
    });
  });
});

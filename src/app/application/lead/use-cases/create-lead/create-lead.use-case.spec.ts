import { BusinessNameInvalidError } from '@domain/lead/errors/business-name-invalid.error';
import { ContactInfoEmptyError } from '@domain/lead/errors/contact-info-empty.error';
import { DuplicateLeadError } from '@domain/lead/errors/duplicate-lead.error';
import { EmailInvalidError } from '@domain/lead/errors/email-invalid.error';
import { PhoneNumberInvalidError } from '@domain/lead/errors/phone-number-invalid.error';
import { SectorInvalidError } from '@domain/lead/errors/sector-invalid.error';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { CreateLeadUseCase } from './create-lead.use-case';
import type { CreateLeadInput } from './create-lead.input.dto';

const NOW = new Date('2026-05-18T12:00:00.000Z');

function makeInput(overrides: Partial<CreateLeadInput> = {}): CreateLeadInput {
  return {
    businessName: 'Acme Clinic',
    sector: 'Clínicas & Consultórios',
    city: 'Niterói',
    address: 'Rua A, 123',
    phone: '(21) 99999-0001',
    email: 'Contato@Acme.com',
    rating: 4.5,
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

describe('CreateLeadUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call repository.save when input is valid', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    await useCase.execute(makeInput());

    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw BusinessNameInvalidError for empty name', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    await expect(useCase.execute(makeInput({ businessName: '   ' }))).rejects.toBeInstanceOf(
      BusinessNameInvalidError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw SectorInvalidError for unknown sector', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    await expect(useCase.execute(makeInput({ sector: 'unknown' }))).rejects.toBeInstanceOf(
      SectorInvalidError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw ContactInfoEmptyError when neither phone nor email provided', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    await expect(useCase.execute(makeInput({ phone: null, email: null }))).rejects.toBeInstanceOf(
      ContactInfoEmptyError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw PhoneNumberInvalidError for malformed phone', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    await expect(useCase.execute(makeInput({ phone: 'abc' }))).rejects.toBeInstanceOf(
      PhoneNumberInvalidError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw EmailInvalidError for malformed email', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    await expect(useCase.execute(makeInput({ email: 'no-at-sign' }))).rejects.toBeInstanceOf(
      EmailInvalidError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw DuplicateLeadError when existsByPhoneAndCity returns true', async () => {
    const repository = makeRepositoryMock();
    repository.existsByPhoneAndCity.mockResolvedValueOnce(true);
    const useCase = new CreateLeadUseCase(repository);

    await expect(useCase.execute(makeInput())).rejects.toBeInstanceOf(DuplicateLeadError);
    expect(repository.existsByPhoneAndCity.mock.calls[0]?.[0].getValue()).toBe('21999990001');
    expect(repository.existsByPhoneAndCity).toHaveBeenCalledWith(
      expect.objectContaining({}),
      'Niterói',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should NOT call existsByPhoneAndCity when phone is null', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    await useCase.execute(makeInput({ phone: null }));

    expect(repository.existsByPhoneAndCity).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('should return LeadDto with id, businessName, etc.', async () => {
    const repository = makeRepositoryMock();
    const useCase = new CreateLeadUseCase(repository);

    const output = await useCase.execute(makeInput());

    expect(output.lead).toMatchObject({
      businessName: 'Acme Clinic',
      sector: 'Clínicas & Consultórios',
      city: 'Niterói',
      address: 'Rua A, 123',
      phone: '(21) 99999-0001',
      phoneDigits: '21999990001',
      email: 'contato@acme.com',
      status: 'novo',
      notes: '',
      rating: 4.5,
      contactCount: 0,
      lastContactAtIso: null,
      hasWebsite: false,
      createdAtIso: '2026-05-18T12:00:00.000Z',
    });
    expect(output.lead.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

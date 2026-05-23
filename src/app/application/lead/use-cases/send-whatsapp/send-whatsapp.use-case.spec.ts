import { Lead, type LeadSnapshot } from '@domain/lead/entities/lead.entity';
import { LeadMissingContactChannelError } from '@domain/lead/errors/lead-missing-contact-channel.error';
import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import type {
  ContactDispatcherService,
  RenderedMessage,
} from '@domain/lead/services/contact-dispatcher.service';
import type {
  MessageTemplate,
  MessageTemplateService,
} from '@domain/lead/services/message-template.service';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { Email } from '@domain/lead/value-objects/email.vo';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { SendWhatsAppUseCase } from './send-whatsapp.use-case';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';
const CREATED_AT = new Date('2026-05-18T12:00:00.000Z');
const NOW = new Date('2026-05-20T15:30:00.000Z');
const WHATSAPP_TEMPLATE: MessageTemplate = {
  channel: 'whatsapp',
  subject: null,
  body: 'Olá {{nome}}',
};
const RENDERED_MESSAGE: RenderedMessage = {
  subject: null,
  body: 'Olá Acme Clinic',
};

function makeRepositoryMock(): jest.Mocked<LeadRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    existsByPhoneAndCity: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    statsByStatus: jest.fn(),
  };
}

function makeDispatcherMock(): jest.Mocked<ContactDispatcherService> {
  return {
    dispatchWhatsApp: jest.fn().mockReturnValue({ url: 'https://wa.me/5521999990001' }),
    dispatchEmail: jest.fn(),
  };
}

function makeTemplateServiceMock(): jest.Mocked<MessageTemplateService> {
  return {
    getTemplate: jest.fn().mockReturnValue(WHATSAPP_TEMPLATE),
    render: jest.fn().mockReturnValue(RENDERED_MESSAGE),
  };
}

function makeSnapshot(overrides: Partial<LeadSnapshot> = {}): LeadSnapshot {
  return {
    id: LeadId.fromString(LEAD_ID),
    businessName: BusinessName.create('Acme Clinic'),
    sector: Sector.create('Clínicas & Consultórios'),
    location: Location.create({ city: 'Niterói', address: 'Rua A, 123' }),
    contactInfo: ContactInfo.create({
      phone: PhoneNumber.create('(21) 99999-0001'),
      email: Email.create('contato@acme.com'),
    }),
    status: LeadStatus.novo(),
    notes: '',
    rating: 4.5,
    contactCount: 0,
    lastContactAt: null,
    hasWebsite: false,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function makeLead(overrides: Partial<LeadSnapshot> = {}): Lead {
  return Lead.reconstitute(makeSnapshot(overrides));
}

function makeUseCase(repository = makeRepositoryMock()): {
  readonly repository: jest.Mocked<LeadRepository>;
  readonly dispatcher: jest.Mocked<ContactDispatcherService>;
  readonly templateService: jest.Mocked<MessageTemplateService>;
  readonly useCase: SendWhatsAppUseCase;
} {
  const dispatcher = makeDispatcherMock();
  const templateService = makeTemplateServiceMock();

  return {
    repository,
    dispatcher,
    templateService,
    useCase: new SendWhatsAppUseCase(repository, dispatcher, templateService),
  };
}

describe('SendWhatsAppUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throw LeadNotFoundError when lead does not exist', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(null);
    const { useCase, dispatcher } = makeUseCase(repository);

    await expect(useCase.execute({ leadId: LEAD_ID })).rejects.toBeInstanceOf(LeadNotFoundError);
    expect(dispatcher.dispatchWhatsApp).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw LeadMissingContactChannelError when lead has no phone', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(
      makeLead({ contactInfo: ContactInfo.create({ email: Email.create('contato@acme.com') }) }),
    );
    const { useCase, dispatcher } = makeUseCase(repository);

    await expect(useCase.execute({ leadId: LEAD_ID })).rejects.toBeInstanceOf(
      LeadMissingContactChannelError,
    );
    expect(dispatcher.dispatchWhatsApp).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("should call messageTemplateService.getTemplate with 'whatsapp'", async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(makeLead());
    const { useCase, templateService } = makeUseCase(repository);

    await useCase.execute({ leadId: LEAD_ID });

    expect(templateService.getTemplate).toHaveBeenCalledWith('whatsapp');
  });

  it("should call messageTemplateService.render with lead's name, sector, city", async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(makeLead());
    const { useCase, templateService } = makeUseCase(repository);

    await useCase.execute({ leadId: LEAD_ID });

    expect(templateService.render).toHaveBeenCalledWith(WHATSAPP_TEMPLATE, {
      nome: 'Acme Clinic',
      setor: 'Clínicas & Consultórios',
      cidade: 'Niterói',
    });
  });

  it('should call contactDispatcher.dispatchWhatsApp with formatted digits and rendered message', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(makeLead());
    const { useCase, dispatcher } = makeUseCase(repository);

    await useCase.execute({ leadId: LEAD_ID });

    expect(dispatcher.dispatchWhatsApp).toHaveBeenCalledWith({
      phoneWhatsAppDigits: '5521999990001',
      message: RENDERED_MESSAGE,
    });
  });

  it("should call lead.registerContact('whatsapp', now)", async () => {
    const repository = makeRepositoryMock();
    const lead = makeLead({ status: LeadStatus.novo() });
    repository.findById.mockResolvedValueOnce(lead);
    const { useCase } = makeUseCase(repository);

    await useCase.execute({ leadId: LEAD_ID });

    expect(lead.contactCount).toBe(1);
    expect(lead.lastContactAt).toEqual(NOW);
    expect(lead.status.getValue()).toBe('contatado');
  });

  it('should save lead after registering contact', async () => {
    const repository = makeRepositoryMock();
    const lead = makeLead();
    repository.findById.mockResolvedValueOnce(lead);
    const { useCase } = makeUseCase(repository);

    await useCase.execute({ leadId: LEAD_ID });

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(lead);
    expect(lead.contactCount).toBe(1);
  });

  it('should return dispatchedUrl from dispatcher result', async () => {
    const repository = makeRepositoryMock();
    repository.findById.mockResolvedValueOnce(makeLead());
    const { useCase } = makeUseCase(repository);

    const output = await useCase.execute({ leadId: LEAD_ID });

    expect(output.dispatchedUrl).toBe('https://wa.me/5521999990001');
    expect(output.lead).toMatchObject({
      id: LEAD_ID,
      status: 'contatado',
      contactCount: 1,
      lastContactAtIso: '2026-05-20T15:30:00.000Z',
    });
  });
});

import type { UseCase } from '@application/shared/use-case.interface';
import { LeadMissingContactChannelError } from '@domain/lead/errors/lead-missing-contact-channel.error';
import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import type { ContactDispatcherService } from '@domain/lead/services/contact-dispatcher.service';
import type { MessageTemplateService } from '@domain/lead/services/message-template.service';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadMapper } from '../../dtos/lead.mapper';
import type { SendWhatsAppInput } from './send-whatsapp.input.dto';
import type { SendWhatsAppOutput } from './send-whatsapp.output.dto';

export class SendWhatsAppUseCase implements UseCase<SendWhatsAppInput, SendWhatsAppOutput> {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly contactDispatcher: ContactDispatcherService,
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  async execute(input: SendWhatsAppInput): Promise<SendWhatsAppOutput> {
    const leadId = LeadId.fromString(input.leadId);
    const lead = await this.leadRepository.findById(leadId);

    if (lead === null) {
      throw new LeadNotFoundError(leadId.getValue());
    }

    const phone = lead.contactInfo.getPhone();

    if (!lead.contactInfo.hasPhone() || phone === null) {
      throw new LeadMissingContactChannelError(lead.id.getValue(), 'whatsapp');
    }

    const template = this.messageTemplateService.getTemplate('whatsapp');
    const rendered = this.messageTemplateService.render(template, {
      nome: lead.businessName.getValue(),
      setor: lead.sector.getValue(),
      cidade: lead.location.getCity(),
    });
    const dispatchResult = this.contactDispatcher.dispatchWhatsApp({
      phoneWhatsAppDigits: phone.toWhatsAppDigits(),
      message: rendered,
    });

    lead.registerContact('whatsapp', new Date());
    await this.leadRepository.save(lead);

    return {
      lead: LeadMapper.toDto(lead),
      dispatchedUrl: dispatchResult.url,
    };
  }
}

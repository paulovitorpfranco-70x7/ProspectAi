import type { UseCase } from '@application/shared/use-case.interface';
import { LeadMissingContactChannelError } from '@domain/lead/errors/lead-missing-contact-channel.error';
import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import type { ContactDispatcherService } from '@domain/lead/services/contact-dispatcher.service';
import type { MessageTemplateService } from '@domain/lead/services/message-template.service';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadMapper } from '../../dtos/lead.mapper';
import type { SendEmailInput } from './send-email.input.dto';
import type { SendEmailOutput } from './send-email.output.dto';

export class SendEmailUseCase implements UseCase<SendEmailInput, SendEmailOutput> {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly contactDispatcher: ContactDispatcherService,
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  async execute(input: SendEmailInput): Promise<SendEmailOutput> {
    const leadId = LeadId.fromString(input.leadId);
    const lead = await this.leadRepository.findById(leadId);

    if (lead === null) {
      throw new LeadNotFoundError(leadId.getValue());
    }

    const email = lead.contactInfo.getEmail();

    if (!lead.contactInfo.hasEmail() || email === null) {
      throw new LeadMissingContactChannelError(lead.id.getValue(), 'email');
    }

    const template = this.messageTemplateService.getTemplate('email');
    const rendered = this.messageTemplateService.render(template, {
      nome: lead.businessName.getValue(),
      setor: lead.sector.getValue(),
      cidade: lead.location.getCity(),
    });
    const dispatchResult = this.contactDispatcher.dispatchEmail({
      to: email.getValue(),
      message: rendered,
    });

    lead.registerContact('email', new Date());
    await this.leadRepository.save(lead);

    return {
      lead: LeadMapper.toDto(lead),
      dispatchedUrl: dispatchResult.url,
    };
  }
}

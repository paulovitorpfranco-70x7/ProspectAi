import { DomainError } from '@domain/shared';

export class LeadMissingContactChannelError extends DomainError {
  readonly code = 'LEAD_MISSING_CONTACT_CHANNEL';

  constructor(
    readonly leadId: string,
    readonly channel: 'whatsapp' | 'email',
  ) {
    super(
      `Lead ${leadId} não possui ${
        channel === 'whatsapp' ? 'telefone' : 'e-mail'
      } cadastrado.`,
    );
  }
}

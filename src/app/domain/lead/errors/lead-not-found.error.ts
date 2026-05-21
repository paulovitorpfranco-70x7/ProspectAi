import { DomainError } from '@domain/shared';

export class LeadNotFoundError extends DomainError {
  readonly code = 'LEAD_NOT_FOUND';

  constructor(readonly leadId: string) {
    super(`Lead ${leadId} não encontrado.`);
  }
}

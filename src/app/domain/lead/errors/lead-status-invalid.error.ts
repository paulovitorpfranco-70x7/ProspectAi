import { DomainError } from '@domain/shared';

export class LeadStatusInvalidError extends DomainError {
  readonly code = 'LEAD_STATUS_INVALID';

  constructor(value: string) {
    super(`Status "${value}" não é um LeadStatus válido.`);
  }
}

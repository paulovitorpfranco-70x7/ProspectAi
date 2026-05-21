import { DomainError } from '@domain/shared';

export class LeadIdInvalidError extends DomainError {
  readonly code = 'LEAD_ID_INVALID';

  constructor(value: string) {
    super(`LeadId inválido: "${value}". Esperado UUID v4.`);
  }
}

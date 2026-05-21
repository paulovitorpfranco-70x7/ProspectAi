import { DomainError } from '@domain/shared';

export class BusinessNameInvalidError extends DomainError {
  readonly code = 'BUSINESS_NAME_INVALID';

  constructor(reason: 'EMPTY' | 'TOO_SHORT' | 'TOO_LONG') {
    super(`Nome do negócio inválido: ${reason}.`);
  }
}

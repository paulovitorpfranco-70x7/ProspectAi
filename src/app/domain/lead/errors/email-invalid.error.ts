import { DomainError } from '@domain/shared';

export class EmailInvalidError extends DomainError {
  readonly code = 'EMAIL_INVALID';

  constructor(value: string) {
    super(`E-mail inválido: "${value}".`);
  }
}

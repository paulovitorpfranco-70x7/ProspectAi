import { DomainError } from '@domain/shared';

export class PhoneNumberInvalidError extends DomainError {
  readonly code = 'PHONE_NUMBER_INVALID';

  constructor(reason: 'EMPTY' | 'WRONG_LENGTH' | 'NON_NUMERIC') {
    super(`Telefone inválido: ${reason}.`);
  }
}

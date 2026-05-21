import { DomainError } from '@domain/shared';

export class DuplicateLeadError extends DomainError {
  readonly code = 'DUPLICATE_LEAD';

  constructor(
    readonly phone: string,
    readonly city: string,
  ) {
    super(`Já existe lead com telefone ${phone} em ${city}.`);
  }
}

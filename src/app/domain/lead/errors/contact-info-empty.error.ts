import { DomainError } from '@domain/shared';

export class ContactInfoEmptyError extends DomainError {
  readonly code = 'CONTACT_INFO_EMPTY';

  constructor() {
    super('ContactInfo precisa de pelo menos telefone OU e-mail.');
  }
}

import { DomainError } from '@domain/shared';

export class LeadNotesTooLongError extends DomainError {
  readonly code = 'LEAD_NOTES_TOO_LONG';

  constructor(
    readonly length: number,
    readonly max: number,
  ) {
    super(`Notas com ${length} caracteres excedem o limite de ${max}.`);
  }
}

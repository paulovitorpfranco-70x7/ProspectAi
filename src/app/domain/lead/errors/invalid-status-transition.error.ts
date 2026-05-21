import { DomainError } from '@domain/shared';

export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';

  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super(`Transição inválida: ${from} → ${to}.`);
  }
}

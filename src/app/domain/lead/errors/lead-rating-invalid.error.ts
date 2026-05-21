import { DomainError } from '@domain/shared';

export class LeadRatingInvalidError extends DomainError {
  readonly code = 'LEAD_RATING_INVALID';

  constructor(readonly value: number) {
    super(`Rating ${value} fora do intervalo permitido (0–5).`);
  }
}

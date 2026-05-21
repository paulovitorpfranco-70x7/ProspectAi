import { DomainError } from '@domain/shared';

export class PlaceFinderUnavailableError extends DomainError {
  readonly code = 'PLACE_FINDER_UNAVAILABLE';

  constructor(override readonly cause: string) {
    super(`Provider de busca indisponível: ${cause}.`);
  }
}

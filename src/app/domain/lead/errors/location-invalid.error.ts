import { DomainError } from '@domain/shared';

export class LocationInvalidError extends DomainError {
  readonly code = 'LOCATION_INVALID';

  constructor(field: 'CITY' | 'ADDRESS', reason: string) {
    super(`Localização inválida em ${field}: ${reason}.`);
  }
}

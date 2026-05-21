import { DomainError } from '@domain/shared';

export class SectorInvalidError extends DomainError {
  readonly code = 'SECTOR_INVALID';

  constructor(value: string) {
    super(`Setor "${value}" não está na lista canônica.`);
  }
}

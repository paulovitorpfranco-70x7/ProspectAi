import { DomainError } from '@domain/shared';

export class DispatchFailedError extends DomainError {
  readonly code = 'DISPATCH_FAILED';

  constructor(
    readonly channel: 'whatsapp' | 'email',
    override readonly cause: string,
  ) {
    super(`Falha ao despachar via ${channel}: ${cause}.`);
  }
}

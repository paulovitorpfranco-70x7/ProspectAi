import { DomainEvent } from '../../shared/events/domain-event.base';
import { LeadId } from '../value-objects/lead-id.vo';

export type ContactChannel = 'whatsapp' | 'email';

export class LeadContactedEvent extends DomainEvent {
  readonly eventName = 'LeadContacted' as const;

  constructor(
    readonly leadId: LeadId,
    readonly channel: ContactChannel,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

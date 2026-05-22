import { DomainEvent } from '../../shared/events/domain-event.base';
import type { ContactChannel } from '../entities/lead.entity';
import { LeadId } from '../value-objects/lead-id.vo';

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

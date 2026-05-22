import { DomainEvent } from '../../shared/events/domain-event.base';
import { LeadId } from '../value-objects/lead-id.vo';
import { LeadStatus } from '../value-objects/lead-status.vo';

export class LeadStatusChangedEvent extends DomainEvent {
  readonly eventName = 'LeadStatusChanged' as const;

  constructor(
    readonly leadId: LeadId,
    readonly from: LeadStatus,
    readonly to: LeadStatus,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

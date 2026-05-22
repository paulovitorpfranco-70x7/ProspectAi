import { DomainEvent } from '../../shared/events/domain-event.base';
import { BusinessName } from '../value-objects/business-name.vo';
import { LeadId } from '../value-objects/lead-id.vo';
import { Sector } from '../value-objects/sector.vo';

export class LeadCreatedEvent extends DomainEvent {
  readonly eventName = 'LeadCreated' as const;

  constructor(
    readonly leadId: LeadId,
    readonly businessName: BusinessName,
    readonly sector: Sector,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

import { BusinessName } from '../value-objects/business-name.vo';
import { LeadId } from '../value-objects/lead-id.vo';
import { Sector } from '../value-objects/sector.vo';
import { LeadCreatedEvent } from './lead-created.event';

describe('LeadCreatedEvent', () => {
  it('should expose eventName, payload and occurredAt', () => {
    const leadId = LeadId.fromString('550e8400-e29b-41d4-a716-446655440000');
    const businessName = BusinessName.create('Silabala Tecnologia');
    const sector = Sector.create('Restaurantes');

    const event = new LeadCreatedEvent(leadId, businessName, sector);

    expect(event.eventName).toBe('LeadCreated');
    expect(event.leadId).toBe(leadId);
    expect(event.businessName).toBe(businessName);
    expect(event.sector).toBe(sector);
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});

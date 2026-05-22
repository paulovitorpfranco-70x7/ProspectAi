import { LeadId } from '../value-objects/lead-id.vo';
import { LeadContactedEvent } from './lead-contacted.event';

describe('LeadContactedEvent', () => {
  it('should expose eventName, payload and occurredAt', () => {
    const leadId = LeadId.fromString('550e8400-e29b-41d4-a716-446655440000');

    const event = new LeadContactedEvent(leadId, 'whatsapp');

    expect(event.eventName).toBe('LeadContacted');
    expect(event.leadId).toBe(leadId);
    expect(event.channel).toBe('whatsapp');
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});

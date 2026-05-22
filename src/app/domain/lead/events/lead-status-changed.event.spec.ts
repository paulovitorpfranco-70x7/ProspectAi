import { LeadId } from '../value-objects/lead-id.vo';
import { LeadStatus } from '../value-objects/lead-status.vo';
import { LeadStatusChangedEvent } from './lead-status-changed.event';

describe('LeadStatusChangedEvent', () => {
  it('should expose eventName, payload and occurredAt', () => {
    const leadId = LeadId.fromString('550e8400-e29b-41d4-a716-446655440000');
    const from = LeadStatus.novo();
    const to = LeadStatus.contatado();

    const event = new LeadStatusChangedEvent(leadId, from, to);

    expect(event.eventName).toBe('LeadStatusChanged');
    expect(event.leadId).toBe(leadId);
    expect(event.from).toBe(from);
    expect(event.to).toBe(to);
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});

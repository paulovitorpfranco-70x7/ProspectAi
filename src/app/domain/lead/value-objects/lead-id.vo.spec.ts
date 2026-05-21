import { LeadIdInvalidError } from '@domain/lead/errors/lead-id-invalid.error';
import { LeadId } from './lead-id.vo';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('LeadId', () => {
  describe('generate', () => {
    it('should produce a valid UUID v4', () => {
      const leadId = LeadId.generate();

      expect(leadId.getValue()).toMatch(UUID_V4_REGEX);
    });

    it('should produce different ids on each call', () => {
      const first = LeadId.generate();
      const second = LeadId.generate();

      expect(first.getValue()).not.toBe(second.getValue());
    });
  });

  describe('fromString', () => {
    it('should accept valid UUID v4 string', () => {
      const value = '550e8400-e29b-41d4-a716-446655440000';

      const leadId = LeadId.fromString(value);

      expect(leadId.getValue()).toBe(value);
    });

    it('should throw LeadIdInvalidError when string is not UUID', () => {
      expect(() => LeadId.fromString('not-a-uuid')).toThrow(LeadIdInvalidError);
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const value = '550e8400-e29b-41d4-a716-446655440000';
      const first = LeadId.fromString(value);
      const second = LeadId.fromString(value);

      expect(first.equals(second)).toBe(true);
    });

    it('should return false for different values', () => {
      const first = LeadId.fromString('550e8400-e29b-41d4-a716-446655440000');
      const second = LeadId.fromString('550e8400-e29b-41d4-a716-446655440001');

      expect(first.equals(second)).toBe(false);
    });
  });
});

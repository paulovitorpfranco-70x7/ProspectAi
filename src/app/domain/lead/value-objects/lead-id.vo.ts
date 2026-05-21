import { LeadIdInvalidError } from '@domain/lead/errors/lead-id-invalid.error';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LeadId {
  private constructor(private readonly value: string) {}

  static generate(): LeadId {
    return new LeadId(globalThis.crypto.randomUUID());
  }

  static fromString(value: string): LeadId {
    if (!UUID_V4_REGEX.test(value)) {
      throw new LeadIdInvalidError(value);
    }

    return new LeadId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LeadId): boolean {
    return this.value === other.value;
  }
}

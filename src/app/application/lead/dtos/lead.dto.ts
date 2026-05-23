import type { LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';

export interface LeadDto {
  readonly id: string;
  readonly businessName: string;
  readonly sector: string;
  readonly city: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly phoneDigits: string | null;
  readonly email: string | null;
  readonly status: LeadStatusValue;
  readonly notes: string;
  readonly rating: number | null;
  readonly contactCount: number;
  readonly lastContactAtIso: string | null;
  readonly hasWebsite: boolean;
  readonly createdAtIso: string;
}

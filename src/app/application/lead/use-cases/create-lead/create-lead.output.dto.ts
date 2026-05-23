import type { LeadDto } from '../../dtos/lead.dto';

export interface CreateLeadOutput {
  readonly lead: LeadDto;
}

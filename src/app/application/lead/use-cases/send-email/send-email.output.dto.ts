import type { LeadDto } from '../../dtos/lead.dto';

export interface SendEmailOutput {
  readonly lead: LeadDto;
  readonly dispatchedUrl: string;
}

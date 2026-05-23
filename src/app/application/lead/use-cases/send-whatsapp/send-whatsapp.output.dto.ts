import type { LeadDto } from '../../dtos/lead.dto';

export interface SendWhatsAppOutput {
  readonly lead: LeadDto;
  readonly dispatchedUrl: string;
}

import type { Lead } from '@domain/lead/entities/lead.entity';
import type { AbVariant, OutreachEvent, OutreachStage } from './types';

export interface RegistrarEnvioParams {
  readonly leadId: string;
  readonly stage: OutreachStage;
  readonly variant: AbVariant | null;
  readonly renderedMessage: string;
  readonly nextFollowupAt: Date | null;
}

export interface OutreachRepositoryPort {
  registrarEnvio(params: RegistrarEnvioParams): Promise<OutreachEvent>;
  desfazerUltimoEnvio(leadId: string, eventId: string): Promise<OutreachEvent>;
  listarEventosPorLead(leadId: string): Promise<OutreachEvent[]>;
  listarEventosEntre(inicio: Date, fim: Date): Promise<OutreachEvent[]>;
  listarFollowupsPendentes(ate: Date): Promise<Lead[]>;
}

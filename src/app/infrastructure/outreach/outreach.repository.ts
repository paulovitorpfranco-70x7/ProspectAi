import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lead } from '@domain/lead/entities/lead.entity';
import type {
  OutreachRepositoryPort,
  RegistrarEnvioParams,
} from '@domain/outreach/outreach.repository';
import { STAGE_ORDER, type OutreachEvent, type OutreachStage } from '@domain/outreach/types';
import { SupabaseClientService } from '../supabase/client/supabase.client';
import { SupabaseLeadMapper } from '../supabase/mappers/lead.mapper';
import type { Database } from '../supabase/types/database.types';

type OutreachEventRow = Database['public']['Tables']['lead_outreach_events']['Row'];

@Injectable({ providedIn: 'root' })
export class OutreachRepository implements OutreachRepositoryPort {
  private readonly supabaseClient = inject(SupabaseClientService);
  private readonly supabase: SupabaseClient<Database> = this.supabaseClient.client;

  async registrarEnvio(params: RegistrarEnvioParams): Promise<OutreachEvent> {
    const { data, error } = await this.supabase.rpc('registrar_envio_outreach', {
      p_lead_id: params.leadId,
      p_stage: params.stage,
      p_variant: params.variant,
      p_mensagem: params.renderedMessage,
      p_next_followup: params.nextFollowupAt?.toISOString() ?? null,
    });

    if (error !== null) {
      throw error;
    }

    if (data === null) {
      throw new Error('A RPC registrar_envio_outreach não retornou o evento criado');
    }

    return this.toDomainEvent(data);
  }

  async listarEventosPorLead(leadId: string): Promise<OutreachEvent[]> {
    const { data, error } = await this.supabase
      .from('lead_outreach_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false });

    if (error !== null) {
      throw error;
    }

    return data.map((row) => this.toDomainEvent(row));
  }

  async listarEventosEntre(inicio: Date, fim: Date): Promise<OutreachEvent[]> {
    const { data, error } = await this.supabase
      .from('lead_outreach_events')
      .select('*')
      .gte('sent_at', inicio.toISOString())
      .lt('sent_at', fim.toISOString())
      .order('sent_at', { ascending: false });

    if (error !== null) {
      throw error;
    }

    return data.map((row) => this.toDomainEvent(row));
  }

  async listarFollowupsPendentes(ate: Date): Promise<Lead[]> {
    const { data, error } = await this.supabase
      .from('leads')
      .select('*')
      .lte('next_followup_at', ate.toISOString())
      .order('next_followup_at', { ascending: true });

    if (error !== null) {
      throw error;
    }

    return data.map((row) => SupabaseLeadMapper.toDomain(row));
  }

  private toDomainEvent(row: OutreachEventRow): OutreachEvent {
    const stage = row.stage as OutreachStage;

    if (!STAGE_ORDER.includes(stage)) {
      throw new Error(`Estágio de outreach inválido recebido do Supabase: ${row.stage}`);
    }

    if (row.variant !== null && row.variant !== 'A' && row.variant !== 'B') {
      throw new Error(`Variação de outreach inválida recebida do Supabase: ${row.variant}`);
    }

    return {
      id: row.id,
      leadId: row.lead_id,
      stage,
      variant: row.variant,
      renderedMessage: row.rendered_message,
      sentAt: new Date(row.sent_at),
    };
  }
}

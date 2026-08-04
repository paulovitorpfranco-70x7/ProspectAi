import { Injector, runInInjectionContext } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientService } from '../supabase/client/supabase.client';
import type { Database } from '../supabase/types/database.types';
import { OutreachRepository } from './outreach.repository';

type OutreachEventRow = Database['public']['Tables']['lead_outreach_events']['Row'];
type LeadRow = Database['public']['Tables']['leads']['Row'];

const EVENT_ROW: OutreachEventRow = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  lead_id: '550e8400-e29b-41d4-a716-446655440001',
  stage: 'm1a_permissao',
  variant: 'A',
  rendered_message: 'Fala! Beleza?',
  sent_at: '2026-08-04T15:00:00.000Z',
};

const LEAD_ROW: LeadRow = {
  id: EVENT_ROW.lead_id,
  google_place_id: null,
  business_name: 'Barbearia Central',
  sector: 'Salões & Barbearias',
  city: 'Niterói',
  city_normalized: 'niterói',
  address: 'Rua A, 123',
  phone_digits: '21999998888',
  email: null,
  status: 'novo',
  notes: '',
  rating: 4.8,
  contact_count: 0,
  last_contact_at: null,
  has_website: false,
  instagram_handle: null,
  website_quality: null,
  lead_score: 80,
  opening_hours: null,
  top_reviews: null,
  preview_url: null,
  preview_views: 0,
  preview_last_viewed_at: null,
  current_stage: 'm1a_permissao',
  stage_sent_at: EVENT_ROW.sent_at,
  next_followup_at: '2026-08-06T15:00:00.000Z',
  ab_variant: 'A',
  created_at: '2026-08-04T12:00:00.000Z',
  updated_at: '2026-08-04T15:00:00.000Z',
  created_by: null,
  updated_by: null,
};

function makeRepository(client: SupabaseClient<Database>): OutreachRepository {
  const injector = Injector.create({
    providers: [{ provide: SupabaseClientService, useValue: { client } }],
  });

  return runInInjectionContext(injector, () => new OutreachRepository());
}

function asSupabaseClient(client: object): SupabaseClient<Database> {
  return client as SupabaseClient<Database>;
}

describe('OutreachRepository', () => {
  it('registrarEnvio should call the atomic RPC with the correct parameters', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: EVENT_ROW, error: null });
    const from = jest.fn();
    const repository = makeRepository(asSupabaseClient({ rpc, from }));
    const nextFollowupAt = new Date('2026-08-06T15:00:00.000Z');

    const result = await repository.registrarEnvio({
      leadId: EVENT_ROW.lead_id,
      stage: 'm1a_permissao',
      variant: 'A',
      renderedMessage: EVENT_ROW.rendered_message,
      nextFollowupAt,
    });

    expect(rpc).toHaveBeenCalledWith('registrar_envio_outreach', {
      p_lead_id: EVENT_ROW.lead_id,
      p_stage: 'm1a_permissao',
      p_variant: 'A',
      p_mensagem: EVENT_ROW.rendered_message,
      p_next_followup: nextFollowupAt.toISOString(),
    });
    expect(from).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: EVENT_ROW.id,
      leadId: EVENT_ROW.lead_id,
      stage: 'm1a_permissao',
      variant: 'A',
      renderedMessage: EVENT_ROW.rendered_message,
      sentAt: new Date(EVENT_ROW.sent_at),
    });
  });

  it('registrarEnvio should pass nullable RPC parameters as null', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { ...EVENT_ROW, variant: null },
      error: null,
    });
    const repository = makeRepository(asSupabaseClient({ rpc }));

    await repository.registrarEnvio({
      leadId: EVENT_ROW.lead_id,
      stage: 'f3_d12',
      variant: null,
      renderedMessage: EVENT_ROW.rendered_message,
      nextFollowupAt: null,
    });

    expect(rpc).toHaveBeenCalledWith(
      'registrar_envio_outreach',
      expect.objectContaining({ p_variant: null, p_next_followup: null }),
    );
  });

  it('registrarEnvio should propagate a Supabase error', async () => {
    const error = { message: 'Falha ao registrar envio', code: 'P0001' };
    const rpc = jest.fn().mockResolvedValue({ data: null, error });
    const repository = makeRepository(asSupabaseClient({ rpc }));

    await expect(
      repository.registrarEnvio({
        leadId: EVENT_ROW.lead_id,
        stage: 'm1a_permissao',
        variant: 'A',
        renderedMessage: EVENT_ROW.rendered_message,
        nextFollowupAt: null,
      }),
    ).rejects.toBe(error);
  });

  it('listarEventosPorLead should map snake_case rows to camelCase domain events', async () => {
    const order = jest.fn().mockResolvedValue({ data: [EVENT_ROW], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    const repository = makeRepository(asSupabaseClient({ from }));

    const result = await repository.listarEventosPorLead(EVENT_ROW.lead_id);

    expect(from).toHaveBeenCalledWith('lead_outreach_events');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('lead_id', EVENT_ROW.lead_id);
    expect(order).toHaveBeenCalledWith('sent_at', { ascending: false });
    expect(result).toEqual([
      {
        id: EVENT_ROW.id,
        leadId: EVENT_ROW.lead_id,
        stage: 'm1a_permissao',
        variant: 'A',
        renderedMessage: EVENT_ROW.rendered_message,
        sentAt: new Date(EVENT_ROW.sent_at),
      },
    ]);
  });

  it('listarFollowupsPendentes should filter, order and map leads', async () => {
    const order = jest.fn().mockResolvedValue({ data: [LEAD_ROW], error: null });
    const lte = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ lte });
    const from = jest.fn().mockReturnValue({ select });
    const repository = makeRepository(asSupabaseClient({ from }));
    const ate = new Date('2026-08-07T00:00:00.000Z');

    const result = await repository.listarFollowupsPendentes(ate);

    expect(from).toHaveBeenCalledWith('leads');
    expect(lte).toHaveBeenCalledWith('next_followup_at', ate.toISOString());
    expect(order).toHaveBeenCalledWith('next_followup_at', { ascending: true });
    expect(result).toHaveLength(1);
    expect(result[0]?.id.getValue()).toBe(LEAD_ROW.id);
    expect(result[0]?.businessName.getValue()).toBe(LEAD_ROW.business_name);
  });
});

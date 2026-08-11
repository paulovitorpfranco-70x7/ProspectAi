/** @jest-environment node */
import { Blob, File } from 'node:buffer';
import { ReadableStream, TransformStream } from 'node:stream/web';
import { Injector, runInInjectionContext } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

Object.assign(globalThis, { Blob, File, ReadableStream, TransformStream });
const { fetch, Headers, Request, Response } = jest.requireActual<typeof import('undici')>('undici');
Object.assign(globalThis, { fetch, Headers, Request, Response });
jest.setTimeout(30_000);

import { SupabaseClientService } from '../supabase/client/supabase.client';
import type { Database } from '../supabase/types/database.types';
import { OutreachRepository } from './outreach.repository';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const LEAD_ID = '550e8400-e29b-41d4-a716-446655440091';
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440092';
const SECOND_EVENT_ID = '550e8400-e29b-41d4-a716-446655440093';

function makeRepository(client: SupabaseClient<Database>): OutreachRepository {
  const injector = Injector.create({
    providers: [{ provide: SupabaseClientService, useValue: { client } }],
  });

  return runInInjectionContext(injector, () => new OutreachRepository());
}

describe('OutreachRepository RPC integration', () => {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const repository = makeRepository(supabase);

  beforeEach(async () => {
    await supabase.from('lead_outreach_events').delete().eq('lead_id', LEAD_ID);
    await supabase.from('leads').delete().eq('id', LEAD_ID);

    const { error } = await supabase.from('leads').insert({
      id: LEAD_ID,
      business_name: 'Lead RPC Test',
      sector: 'Salões & Barbearias',
      city: 'Niterói',
      phone_digits: '21999990091',
    });

    if (error !== null) {
      throw error;
    }
  });

  afterAll(async () => {
    await supabase.from('lead_outreach_events').delete().eq('lead_id', LEAD_ID);
    await supabase.from('leads').delete().eq('id', LEAD_ID);
    supabase.auth.stopAutoRefresh();
  });

  it('confirming should create exactly one event and update the lead cadence', async () => {
    const nextFollowupAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1_000);

    const event = await repository.registrarEnvio({
      leadId: LEAD_ID,
      stage: 'm1a_permissao',
      variant: 'A',
      renderedMessage: 'Mensagem confirmada',
      nextFollowupAt,
    });

    const { count } = await supabase
      .from('lead_outreach_events')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', LEAD_ID);
    const { data: lead } = await supabase
      .from('leads')
      .select('current_stage, stage_sent_at, next_followup_at, ab_variant')
      .eq('id', LEAD_ID)
      .single();

    expect(event.leadId).toBe(LEAD_ID);
    expect(count).toBe(1);
    expect(lead).toMatchObject({
      current_stage: 'm1a_permissao',
      ab_variant: 'A',
    });
    expect(lead?.stage_sent_at).not.toBeNull();
    expect(new Date(lead?.next_followup_at ?? '').toISOString()).toBe(nextFollowupAt.toISOString());
  });

  it('undoing should remove the event and restore the lead to the new state', async () => {
    const event = await repository.registrarEnvio({
      leadId: LEAD_ID,
      stage: 'm1a_permissao',
      variant: 'A',
      renderedMessage: 'Mensagem confirmada',
      nextFollowupAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1_000),
    });

    await repository.desfazerUltimoEnvio(LEAD_ID, event.id);

    const { count } = await supabase
      .from('lead_outreach_events')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', LEAD_ID);
    const { data: lead } = await supabase
      .from('leads')
      .select('status, current_stage, stage_sent_at, next_followup_at, ab_variant')
      .eq('id', LEAD_ID)
      .single();

    expect(count).toBe(0);
    expect(lead).toEqual({
      status: 'novo',
      current_stage: null,
      stage_sent_at: null,
      next_followup_at: null,
      ab_variant: null,
    });
  });

  it('undoing should reject an event created on a previous day', async () => {
    const previousDay = new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString();
    const { error: eventError } = await supabase.from('lead_outreach_events').insert({
      id: EVENT_ID,
      lead_id: LEAD_ID,
      stage: 'm1a_permissao',
      variant: 'A',
      rendered_message: 'Mensagem antiga',
      sent_at: previousDay,
    });
    const { error: leadError } = await supabase
      .from('leads')
      .update({
        current_stage: 'm1a_permissao',
        stage_sent_at: previousDay,
        next_followup_at: previousDay,
        ab_variant: 'A',
      })
      .eq('id', LEAD_ID);

    expect(eventError).toBeNull();
    expect(leadError).toBeNull();
    await expect(repository.desfazerUltimoEnvio(LEAD_ID, EVENT_ID)).rejects.toMatchObject({
      code: 'P0001',
      message: 'Somente eventos criados hoje podem ser desfeitos',
    });

    const { count } = await supabase
      .from('lead_outreach_events')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', LEAD_ID);
    const { data: lead } = await supabase
      .from('leads')
      .select('current_stage, stage_sent_at, next_followup_at, ab_variant')
      .eq('id', LEAD_ID)
      .single();
    expect(count).toBe(1);
    expect(lead).toMatchObject({
      current_stage: 'm1a_permissao',
      ab_variant: 'A',
    });
    expect(new Date(lead?.stage_sent_at ?? '').toISOString()).toBe(previousDay);
    expect(new Date(lead?.next_followup_at ?? '').toISOString()).toBe(previousDay);
  });

  it('undoing should reject a non-latest event from today', async () => {
    const earlierToday = new Date(Date.now() - 60_000).toISOString();
    const laterToday = new Date().toISOString();
    const { error } = await supabase.from('lead_outreach_events').insert([
      {
        id: EVENT_ID,
        lead_id: LEAD_ID,
        stage: 'm1a_permissao',
        variant: 'A',
        rendered_message: 'Mensagem anterior',
        sent_at: earlierToday,
      },
      {
        id: SECOND_EVENT_ID,
        lead_id: LEAD_ID,
        stage: 'f1_d2',
        variant: 'A',
        rendered_message: 'Mensagem mais recente',
        sent_at: laterToday,
      },
    ]);

    expect(error).toBeNull();
    await expect(repository.desfazerUltimoEnvio(LEAD_ID, EVENT_ID)).rejects.toMatchObject({
      code: 'P0001',
      message: 'Somente o evento mais recente do lead pode ser desfeito',
    });

    const { count } = await supabase
      .from('lead_outreach_events')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', LEAD_ID);
    expect(count).toBe(2);
  });
});

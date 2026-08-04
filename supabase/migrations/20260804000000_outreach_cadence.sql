-- ProspectAI — Cadência de abordagem por WhatsApp
-- Registra cada envio e mantém o estágio atual do lead de forma atômica.

create table public.lead_outreach_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  stage text not null,
  variant text null,
  rendered_message text not null,
  sent_at timestamptz not null default now()
);

create index lead_outreach_events_lead_sent_at_idx
  on public.lead_outreach_events (lead_id, sent_at desc);

alter table public.leads
  add column if not exists current_stage text null,
  add column if not exists stage_sent_at timestamptz null,
  add column if not exists next_followup_at timestamptz null,
  add column if not exists ab_variant text null;

create index if not exists leads_next_followup_at_idx
  on public.leads (next_followup_at)
  where next_followup_at is not null;

-- Replica a policy MVP atualmente aplicada em public.leads.
alter table public.lead_outreach_events enable row level security;

create policy "mvp_open_access"
  on public.lead_outreach_events
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.lead_outreach_events to anon, authenticated;

create or replace function public.registrar_envio_outreach(
  p_lead_id uuid,
  p_stage text,
  p_variant text,
  p_mensagem text,
  p_next_followup timestamptz
)
returns public.lead_outreach_events
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event public.lead_outreach_events;
begin
  perform 1
  from public.leads
  where id = p_lead_id;

  if not found then
    raise exception 'Lead % não existe ou não está acessível ao usuário atual', p_lead_id
      using errcode = 'P0002';
  end if;

  insert into public.lead_outreach_events (
    lead_id,
    stage,
    variant,
    rendered_message
  )
  values (
    p_lead_id,
    p_stage,
    p_variant,
    p_mensagem
  )
  returning * into v_event;

  update public.leads
  set
    current_stage = p_stage,
    stage_sent_at = v_event.sent_at,
    next_followup_at = p_next_followup,
    ab_variant = p_variant
  where id = p_lead_id;

  if not found then
    raise exception 'Lead % não existe ou não está acessível ao usuário atual', p_lead_id
      using errcode = 'P0002';
  end if;

  return v_event;
end;
$$;

revoke execute on function public.registrar_envio_outreach(uuid, text, text, text, timestamptz)
  from public;

grant execute on function public.registrar_envio_outreach(uuid, text, text, text, timestamptz)
  to anon, authenticated;

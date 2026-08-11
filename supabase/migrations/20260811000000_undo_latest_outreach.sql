-- Desfaz somente o evento mais recente do lead quando ele foi criado hoje
-- no fuso operacional da aplicação. Evento e estado do lead são alterados
-- na mesma transação da RPC.

create or replace function public.desfazer_ultimo_envio_outreach(
  p_lead_id uuid,
  p_event_id uuid
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
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead % não existe ou não está acessível ao usuário atual', p_lead_id
      using errcode = 'P0002';
  end if;

  select event.*
  into v_event
  from public.lead_outreach_events event
  where event.lead_id = p_lead_id
  order by event.sent_at desc, event.id desc
  limit 1
  for update;

  if not found then
    raise exception 'Lead % não possui evento de outreach para desfazer', p_lead_id
      using errcode = 'P0002';
  end if;

  if v_event.id <> p_event_id then
    raise exception 'Somente o evento mais recente do lead pode ser desfeito'
      using errcode = 'P0001';
  end if;

  if (v_event.sent_at at time zone 'America/Sao_Paulo')::date
    <> (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Somente eventos criados hoje podem ser desfeitos'
      using errcode = 'P0001';
  end if;

  delete from public.lead_outreach_events
  where id = v_event.id
    and lead_id = p_lead_id;

  update public.leads
  set
    current_stage = null,
    stage_sent_at = null,
    next_followup_at = null,
    ab_variant = null
  where id = p_lead_id;

  return v_event;
end;
$$;

revoke execute on function public.desfazer_ultimo_envio_outreach(uuid, uuid)
  from public;

grant execute on function public.desfazer_ultimo_envio_outreach(uuid, uuid)
  to anon, authenticated;

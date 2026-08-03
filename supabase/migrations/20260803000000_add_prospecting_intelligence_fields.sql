-- ProspectAI — Fundação do módulo de inteligência de prospecção
-- Adiciona os dados de qualificação, acompanhamento e preview aos leads.

alter table public.leads
  add column instagram_handle text null,
  add column website_quality text null,
  add column lead_score integer not null default 0,
  add column opening_hours jsonb null,
  add column top_reviews jsonb null,
  add column preview_url text null,
  add column preview_views integer not null default 0,
  add column preview_last_viewed_at timestamptz null;

alter table public.leads
  add constraint leads_website_quality_check check (
    website_quality is null
    or website_quality in ('proper', 'weak', 'none')
  );

-- O status legado usa enum e chama a saída negativa de "descartado".
-- Convertemos para text e preservamos esses registros como "perdido".
alter table public.leads
  alter column status drop default,
  alter column status type text
    using case
      when status::text = 'descartado' then 'perdido'
      else status::text
    end,
  alter column status set default 'novo';

alter table public.leads
  add constraint leads_status_check check (status in (
    'novo',
    'contatado',
    'respondeu',
    'preview_enviado',
    'proposta',
    'fechado',
    'perdido'
  ));

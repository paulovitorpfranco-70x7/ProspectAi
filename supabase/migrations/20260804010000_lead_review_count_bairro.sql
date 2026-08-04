alter table public.leads
  add column if not exists review_count integer null,
  add column if not exists bairro text null;

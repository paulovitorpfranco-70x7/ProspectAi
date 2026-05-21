-- ─────────────────────────────────────────────────────────────────────────────
-- ProspectAI — Schema MVP
-- Migration: 20260518000000_init_leads.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensões necessárias
create extension if not exists "pg_trgm";   -- índice GIN trigram pra busca textual ILIKE

-- ── Tipos ──────────────────────────────────────────────────────────────────

create type lead_status as enum (
  'novo',
  'contatado',
  'proposta',
  'fechado',
  'descartado'
);

-- ── Tabela principal ───────────────────────────────────────────────────────

create table public.leads (
  -- Identidade
  id              uuid        primary key,

  -- Identificação do negócio (BusinessName + Sector)
  business_name   text        not null,
  sector          text        not null,

  -- Localização (Location)
  city            text        not null,
  city_normalized text        not null
                  generated always as (lower(btrim(city))) stored,
  address         text        null,

  -- Contato (ContactInfo: phone XOR email obrigatório)
  phone_digits    text        null,
  email           text        null,

  -- Estado do lead
  status          lead_status not null default 'novo',
  notes           text        not null default '',
  rating          numeric(2,1) null,
  contact_count   integer     not null default 0,
  last_contact_at timestamptz null,
  has_website     boolean     not null default false,

  -- Auditoria
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid        null,        -- pronto pra ligar auth na v1.1
  updated_by      uuid        null,

  -- ── Constraints de domínio ──

  -- Sector na lista canônica (10 valores)
  constraint leads_sector_check check (sector in (
    'Clínicas & Consultórios',
    'Salões & Barbearias',
    'Oficinas Mecânicas',
    'Restaurantes',
    'Advocacia',
    'Contabilidade',
    'Academias & Estúdios',
    'Serviços Domésticos',
    'Igrejas & Ministérios',
    'Escolas & Cursos'
  )),

  -- BusinessName: 2-120 chars após trim
  constraint leads_business_name_length check (
    char_length(btrim(business_name)) between 2 and 120
  ),

  -- City: 2-80 chars após trim
  constraint leads_city_length check (
    char_length(btrim(city)) between 2 and 80
  ),

  -- Address: até 200 chars quando presente
  constraint leads_address_length check (
    address is null or char_length(address) <= 200
  ),

  -- Notes: até 2000 chars
  constraint leads_notes_length check (
    char_length(notes) <= 2000
  ),

  -- Rating: 0-5 quando presente
  constraint leads_rating_range check (
    rating is null or (rating >= 0 and rating <= 5)
  ),

  -- Phone: só dígitos, 10 ou 11 (DDD + número BR)
  constraint leads_phone_digits_format check (
    phone_digits is null or phone_digits ~ '^[0-9]{10,11}$'
  ),

  -- Email: formato básico (validação completa fica no VO)
  constraint leads_email_format check (
    email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),

  -- ContactInfo invariant: phone OU email obrigatório
  constraint leads_contact_required check (
    phone_digits is not null or email is not null
  ),

  -- ContactCount não-negativo
  constraint leads_contact_count_non_negative check (
    contact_count >= 0
  )
);

-- ── Constraint de duplicata (phone + cidade) ──────────────────────────────

-- Unique parcial: só vale quando phone_digits não é null.
-- Replica isDuplicate() do JSX linhas 72-76.
create unique index leads_phone_city_unique
  on public.leads (phone_digits, city_normalized)
  where phone_digits is not null;

-- ── Índices pra queries do JSX ────────────────────────────────────────────

-- Filtro por status (mais comum: cada coluna do pipeline)
create index leads_status_idx on public.leads (status);

-- Sort: ORDER BY created_at DESC (default do JSX linha 230)
create index leads_created_at_idx on public.leads (created_at desc);

-- Sort: ORDER BY rating DESC NULLS LAST
create index leads_rating_idx on public.leads (rating desc nulls last);

-- Sort: ORDER BY last_contact_at DESC NULLS LAST
create index leads_last_contact_at_idx on public.leads (last_contact_at desc nulls last);

-- Sort: ORDER BY contact_count DESC
create index leads_contact_count_idx on public.leads (contact_count desc);

-- Filtro por setor (menos comum, mas barato de manter)
create index leads_sector_idx on public.leads (sector);

-- Filtro por cidade
create index leads_city_normalized_idx on public.leads (city_normalized);

-- Busca textual em business_name | city | sector via ILIKE '%q%'
create index leads_business_name_trgm_idx on public.leads
  using gin (business_name gin_trgm_ops);

create index leads_city_trgm_idx on public.leads
  using gin (city gin_trgm_ops);

-- ── Trigger pra updated_at ────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger leads_touch_updated_at
  before update on public.leads
  for each row
  execute function public.touch_updated_at();

-- ── RLS: habilitado com policy permissiva pro MVP ─────────────────────────

alter table public.leads enable row level security;

-- Policy temporária permissiva pro MVP — RLS habilitado mas aberto.
-- Quando ligar auth (v1.1), DROP esta policy e criar a real (owner-based).
create policy "mvp_open_access"
  on public.leads
  for all
  using (true)
  with check (true);

-- ── Grants pro PostgREST ──────────────────────────────────────────────────

grant select, insert, update, delete on public.leads to anon, authenticated;

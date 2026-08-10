# Inventário de domínio para a fila de prospecção

Escopo: Item 0 de `PLAN_FILA.md`. Este documento registra somente o que já existe no projeto.

## 1. Tipo e ordem dos estágios da cadência

Fonte: `src/app/domain/outreach/types.ts:1-9`.

```ts
export type OutreachStage =
  | 'm1a_permissao'
  | 'm1b_direto'
  | 'm2_preview'
  | 'm3_descoberta'
  | 'm4_proposta'
  | 'f1_d2'
  | 'f2_d5'
  | 'f3_d12';
```

A ordem explícita fica no mesmo arquivo, em `src/app/domain/outreach/types.ts:33-42`:

```ts
export const STAGE_ORDER: OutreachStage[] = [
  'm1a_permissao',
  'm1b_direto',
  'm2_preview',
  'm3_descoberta',
  'm4_proposta',
  'f1_d2',
  'f2_d5',
  'f3_d12',
];
```

Observação factual: o projeto define `f2_d5`; não existe um estágio `f2_d7`.

## 2. Intervalos em dias entre estágios

Fonte: `src/app/domain/outreach/machine.ts:29-38`.

```ts
const FOLLOWUP_DELAY_DAYS: Record<OutreachStage, number> = {
  m1a_permissao: 2,
  m1b_direto: 2,
  m2_preview: 2,
  m3_descoberta: 3,
  m4_proposta: 3,
  f1_d2: 3,
  f2_d5: 7,
  f3_d12: 0,
};
```

O mapa representa os dias após o envio do estágio atual. Seu uso está em
`src/app/domain/outreach/machine.ts:61-78`:

```ts
export function followupDelayDays(stage: OutreachStage): number {
  return FOLLOWUP_DELAY_DAYS[stage];
}

export function computeNextFollowup(stage: OutreachStage, sentAt: Date): Date | null {
  const delayDays = followupDelayDays(stage);

  if (delayDays === 0) {
    return null;
  }

  const nextFollowup = new Date(sentAt.getTime());
  nextFollowup.setUTCDate(nextFollowup.getUTCDate() + delayDays);
  return nextFollowup;
}
```

Portanto, `f3_d12: 0` encerra o agendamento e produz `null`, em vez de uma nova data.

## 3. RPC atômica que grava em `lead_outreach_events`

Fonte: `supabase/migrations/20260804000000_outreach_cadence.sql:37-44`.

Nome e assinatura:

```sql
create or replace function public.registrar_envio_outreach(
  p_lead_id uuid,
  p_stage text,
  p_variant text,
  p_mensagem text,
  p_next_followup timestamptz
)
returns public.lead_outreach_events
```

A atomicidade reúne a inserção do evento e a atualização do lead na mesma função.
Trechos em `supabase/migrations/20260804000000_outreach_cadence.sql:61-81`:

```sql
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
```

## 4. Colunas reais de `lead_outreach_events`

Fonte de schema: `supabase/migrations/20260804000000_outreach_cadence.sql:4-11`.

```sql
create table public.lead_outreach_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  stage text not null,
  variant text null,
  rendered_message text not null,
  sent_at timestamptz not null default now()
);
```

As colunas são: `id`, `lead_id`, `stage`, `variant`, `rendered_message` e `sent_at`.
A tipagem gerada confirma o mesmo conjunto em
`src/app/infrastructure/supabase/types/database.types.ts:37-45`:

```ts
lead_outreach_events: {
  Row: {
    id: string
    lead_id: string
    rendered_message: string
    sent_at: string
    stage: string
    variant: string | null
  }
```

## 5. Lista dos 22 setores

Fonte canônica: `src/app/domain/lead/value-objects/sector.vo.ts:27-51`.

```ts
export class Sector {
  static readonly ALL: readonly SectorValue[] = [
    'Clínicas & Consultórios',
    'Clínicas de Estética',
    'Clínicas Veterinárias & Pet',
    'Psicólogos & Terapeutas',
    'Fisioterapia & Pilates',
    'Odontologia',
    'Salões & Barbearias',
    'Salões Femininos',
    'Nail Designers',
    'Estúdios de Tatuagem',
    'Restaurantes',
    'Lanchonetes & Hamburguerias',
    'Padarias & Confeitarias',
    'Marmitarias & Delivery',
    'Oficinas Mecânicas',
    'Academias & Estúdios',
    'Fotógrafos & Estúdios',
    'Serviços Domésticos',
    'Advocacia',
    'Contabilidade',
    'Escolas & Cursos',
    'Igrejas & Ministérios',
  ];
```

O tipo fechado correspondente está no mesmo arquivo, em
`src/app/domain/lead/value-objects/sector.vo.ts:3-25`, como `SectorValue`.

## 6. Registro das rotas Angular

O router é registrado em `src/app/app.config.ts:17-23`:

```ts
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
```

As rotas raiz e o lazy loading por feature ficam em `src/app/app.routes.ts:3-20`:

```ts
export const appRoutes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./presentation/features/search/search.routes').then((m) => m.SEARCH_ROUTES),
  },
  {
    path: 'pipeline',
    loadChildren: () =>
      import('./presentation/features/pipeline/pipeline.routes').then((m) => m.PIPELINE_ROUTES),
  },
  {
    path: 'add',
    loadChildren: () =>
      import('./presentation/features/add-lead/add-lead.routes').then((m) => m.ADD_LEAD_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
```

Cada módulo lazy aponta para seu componente de página. Exemplo em
`src/app/presentation/features/pipeline/pipeline.routes.ts:1-4`:

```ts
import type { Routes } from '@angular/router';
import { PipelinePage } from './pages/pipeline.page';

export const PIPELINE_ROUTES: Routes = [{ path: '', component: PipelinePage }];
```

Guards: **não existe** uso de `canActivate`, `canActivateChild`, `canDeactivate` ou
`canMatch` nas rotas atuais em `src/app`.

## 7. Store representativa com signals

Exemplo: `PipelineStore`, em
`src/app/presentation/features/pipeline/store/pipeline.store.ts:1-2` e
`src/app/presentation/features/pipeline/store/pipeline.store.ts:84-98`.

```ts
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
```

```ts
export const PipelineStore = signalStore(
  withState(initialState),
  withComputed(
    ({
      leads,
      filterStatus,
      searchQuery,
      sortBy,
      outreachFollowups,
      outreachNovos,
      dailySentCount,
      dailyLimit,
    }) => ({
      filteredLeads: computed(() => {
```

O padrão de mutação assíncrona com `withMethods` e `patchState` aparece em
`src/app/presentation/features/pipeline/store/pipeline.store.ts:140-162`:

```ts
withMethods(
  (
    store,
    leadRepository: LeadRepository = inject(LEAD_REPOSITORY),
    updateLeadStatusUseCase = inject(UpdateLeadStatusUseCase),
    deleteLeadUseCase = inject(DeleteLeadUseCase),
    sendWhatsAppUseCase = inject(SendWhatsAppUseCase),
    sendEmailUseCase = inject(SendEmailUseCase),
    outreachQueueService = inject(OutreachQueueService),
  ) => ({
    async loadLeads(): Promise<void> {
      patchState(store, { loading: true, error: null });

      try {
        const leads = await leadRepository.findAll({ sortBy: 'createdAt', sortOrder: 'desc' });
        patchState(store, {
          leads: leads.map((lead) => LeadMapper.toDto(lead)),
          loading: false,
          error: null,
        });
      } catch (error) {
        patchState(store, { loading: false, error: getErrorMessage(error) });
      }
    },
```

## 8. Tokens de tema e fontes

Os tokens de cores e tipografia ficam em `src/styles/_tokens.scss:1-24`:

```scss
:root {
  --color-bg: #0a0a0f;
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-success: #4ade80;
  --color-warning: #facc15;
  --color-danger: #f87171;
  --color-info: #60a5fa;
  --color-accent: #a78bfa;
  --color-text: #e8e8f0;
  --color-text-muted: #888888;
  --color-text-subtle: #555555;
  --color-border: rgba(255,255,255,0.07);
  --color-surface: rgba(255,255,255,0.03);

  --font-sans: 'DM Sans', 'Segoe UI', sans-serif;
  --font-display: 'Syne', sans-serif;
}
```

O carregamento das fontes está em `src/styles.scss:1-5`:

```scss
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

@import './styles/reset';
@import './styles/tokens';
@import './styles/typography';
```

DM Sans existe e é o token `--font-sans`. Bebas Neue: **não existe** no código ou
nos tokens atuais; o token de display existente usa Syne.

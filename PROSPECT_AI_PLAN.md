# ProspectAI — Plano Mestre de Implementação

> **Status:** Planejamento finalizado, pronto para execução pelo Claude Code.
> **Última atualização:** 18 de maio de 2026.
> **Stack:** Angular 17+ standalone · NgRx Signal Store · Supabase · TypeScript strict · SCSS próprio · Jest · Vercel.
> **Arquitetura:** DDD + Clean Architecture com 4 camadas (domain, application, infrastructure, presentation).

Este documento é o **mapa mestre** do ProspectAI. Todo prompt do Claude Code deve referenciar este arquivo. Ele consolida 6 iterações de planejamento entre Paulo e Claude Opus, com decisões já tomadas e justificadas.

---

## Sumário

- [1. Revisão Crítica do Domínio](#1-revisão-crítica-do-domínio)
- [2. Contratos TypeScript Completos](#2-contratos-typescript-completos)
  - [2.1 Domain Layer](#21-domain-layer)
  - [2.2 Repository Interface](#22-repository-interface)
  - [2.3 Service Interfaces (Domain)](#23-service-interfaces-domain)
  - [2.4 Use Case DTOs e Skeletons](#24-use-case-dtos-e-skeletons)
  - [2.5 Error Classes](#25-error-classes)
- [3. Mapa de Dependências](#3-mapa-de-dependências)
- [4. Schema Supabase](#4-schema-supabase)
- [5. Estrutura de Pastas](#5-estrutura-de-pastas)
- [6. Estratégia de Testes](#6-estratégia-de-testes)
- [7. Riscos Técnicos](#7-riscos-técnicos)
- [8. Checklist de Execução para o Codex](#8-checklist-de-execução-para-o-codex)
- [Apêndice: Próximos Passos Práticos](#apêndice-próximos-passos-práticos)

---

## Contexto e Premissas

**Produto:** ProspectAI — micro-SaaS de prospecção de leads para desenvolvedor freelancer que vende criação de sites para pequenos negócios sem presença digital.

**Premissas fixadas:**
- **Único usuário no MVP** (Paulo). Auth real só na v1.1.
- **Google Places via Edge Function** (chave protegida no Supabase secrets).
- **Templates de mensagem hardcoded** no MVP. Edição em runtime fica para v1.1.
- **Anon key + RLS aberto** (policy `mvp_open_access`) — nunca service_role no client.
- **Filtro `hasWebsite=true`** ativo em SearchLeads (é a essência do produto).
- **Sector obrigatório** no form de adição manual.
- **Notes máx 2000 chars.**
- **Phone validation:** apenas BR (10 ou 11 dígitos após normalização).
- **Sem soft delete, sem event sourcing, sem persistência de templates** no MVP.

**Stack técnica imutável:**

```
Framework:     Angular 17+ — Standalone Components APENAS (zero NgModules)
Estado:        NgRx Signal Store (não use NgRx clássico, não use BehaviorSubject solto)
Backend:       Supabase (PostgreSQL + Auth + Edge Functions) — sem Node.js separado
Linguagem:     TypeScript 5+ com strict: true habilitado
Estilos:       SCSS próprio — sem bibliotecas de UI (zero Angular Material, zero PrimeNG)
HTTP externo:  Angular HttpClient para Edge Function Supabase
Testes:        Jest para domain e application / Angular TestBed para presentation
Build:         Angular CLI padrão
Deploy:        Vercel (frontend) + Supabase managed (backend)
Package mgr:   pnpm
```

---

## 1. Revisão Crítica do Domínio

Comparação entre o briefing DDD original, o protótipo JSX e os contratos implementados. Cada item marcado como `[CONFIRMADO]`, `[ADIÇÃO]` ou `[CORREÇÃO]`.

### 1.1 Itens `[CONFIRMADO]` — o JSX valida o briefing

`[CONFIRMADO]` **Aggregate root único: Lead.** Todo o JSX trata leads como entidades isoladas, sem agregação por campanha, conta ou segmento. Não há motivo para introduzir outro aggregate no MVP.

`[CONFIRMADO]` **10 setores canônicos.** O array `SECTORS` (JSX linhas 5–16) é fechado e estável. Modelar como union literal em `Sector` é a escolha certa — não vale a pena tabela `sectors` no Supabase para 10 valores que mudam raramente.

`[CONFIRMADO]` **5 status com grafo cíclico.** As transições `fechado→proposta` e `descartado→novo` (JSX linhas 27–33) confirmam que status **não é monotônico**: o usuário pode reabrir oportunidades. A máquina de estados modelada em `LeadStatus.canTransitionTo()` cobre exatamente isso.

`[CONFIRMADO]` **Duplicata por phone+city normalizado.** A função `isDuplicate` (JSX 72–76) usa `phone.replace(/\D/g, "")` e `city.toLowerCase()`. A assinatura `LeadRepository.existsByPhoneAndCity(PhoneNumber, string)` força essa normalização via VO.

`[CONFIRMADO]` **Templates com placeholders triplos.** `applyTemplate` (JSX 40–45) substitui `{{nome}}`, `{{setor}}`, `{{cidade}}`. Coberto por `MessageTemplateVariables`.

### 1.2 Itens `[ADIÇÃO]` — comportamentos do JSX ausentes ou implícitos no briefing

`[ADIÇÃO]` **Auto-transição `novo → contatado` ao registrar contato.** JSX linhas 178 e 191:

```js
status: lead.status === "novo" ? "contatado" : lead.status,
```

Incorporado em `Lead.registerContact()`. Parece "lógica de UI" mas é invariante de domínio (qualquer canal que registre contato dispara a transição).

`[ADIÇÃO]` **Conceito de "lead stale".** JSX linha 548:

```js
const isStale = lead.status === "contatado" && daysSinceContact !== null && daysSinceContact >= 3;
```

Modelado como `Lead.isStale(now, thresholdDays)`. A decisão de que stale = `contatado` há ≥3d **sem outras transições** é de negócio. Domain é o lugar certo.

`[ADIÇÃO]` **`hasWebsite` no fluxo de busca.** SearchLeads filtra `hasWebsite=true` (decisão da iteração 4). Domain já tem o campo na `Lead`.

`[ADIÇÃO]` **`contactCount` cresce com qualquer canal, não só primeiro contato.** JSX 179 e 192 incrementam `contactCount` toda vez que WhatsApp ou Email é disparado, independentemente do status atual. Isso é semanticamente "tentativas de contato".

`[ADIÇÃO]` **Notes têm semântica de timeline implícita.** Lead #2 (`"Falei com a recepcionista, ligar terça."`) e #4 (`"Enviou e-mail, aguardando retorno."`) sugerem que o usuário trata notes como **histórico narrativo livre**. No MVP, fica string. Em v2, provavelmente vira `Note[]` com timestamp.

`[ADIÇÃO]` **Ordenação por 4 campos.** JSX linha 100 e 222–231: `sortBy: createdAt | rating | contactCount | lastContactAt`. Comportamento "null por último em lastContactAt" preservado via `NULLS LAST` no Postgres.

`[ADIÇÃO]` **Busca textual em 3 campos.** JSX 214–220 faz match em `name | city | sector` com `toLowerCase + includes`. Traduzido para `ILIKE '%query%'` com OR + índice GIN trigram.

### 1.3 Itens `[CORREÇÃO]` — ajustes ao briefing

`[CORREÇÃO]` **`MessageTemplate` não é entidade no MVP.** Existe apenas a **interface** `MessageTemplate` (DTO de leitura) + o serviço que lê defaults da implementação concreta em `infrastructure/templates/`. Quando virar entidade na v2, ganha `MessageTemplateId`, repositório e use cases.

`[CORREÇÃO]` **`Sector` não carrega `icon` nem `query`.** Domain conhece só o label canônico. Ícone vive em `presentation/shared` (constant map `Sector → emoji`). Query Google Places vive em `infrastructure/google-places` (constant map `Sector → "clínica consultório"`).

`[CORREÇÃO]` **`apiKey` do JSX é artefato do protótipo.** JSX linhas 96 e 123 pedem ao usuário inserir a Google Places API Key na própria UI. Isso **não vai pro produto** — a chave fica protegida na Edge Function.

### 1.4 Auditoria de coesão e vazamentos

**Vazamentos de infraestrutura no domain:** zero detectados. Conferido:
- Nenhuma VO importa Angular, Supabase, HttpClient ou Date.now()
- `LeadId.generate()` usa `globalThis.crypto.randomUUID()` — Web Standard, não dependência
- `Lead.isStale(now, ...)` recebe `now` por parâmetro — sem `new Date()` interno
- `LeadRepository` retorna `Lead`/`null`, não `Result<Lead, PostgresError>`
- Eventos são classes puras, sem mecanismo de despacho

**Coesão por bounded context:** só existe um BC no MVP — `lead`. Quando aparecer um segundo BC, a estrutura escala adicionando `domain/<bc>/*` ao lado, sem refatorar `lead`.

**Acoplamento entre VOs:** `ContactInfo` depende de `PhoneNumber` e `Email`. `Lead` depende de todas as 8 VOs. Não há ciclo. Repository e Services dependem só de VOs e da entity.

**Application sem vazamento de framework no domain:** os 4 `InjectionToken` vivem em `application/lead/tokens/` — única gota de Angular que entra na camada, e não contamina o domain.

---

## 2. Contratos TypeScript Completos

### 2.1 Domain Layer

#### 2.1.1 Shared base

```typescript
// domain/shared/errors/domain-error.base.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

```typescript
// domain/shared/events/domain-event.base.ts
export abstract class DomainEvent {
  abstract readonly eventName: string;
  readonly occurredAt: Date;

  protected constructor(occurredAt?: Date) {
    this.occurredAt = occurredAt ?? new Date();
  }
}
```

#### 2.1.2 Value Objects

```typescript
// domain/lead/value-objects/lead-id.vo.ts
export class LeadId {
  private constructor(private readonly value: string) {}

  /** Gera UUID v4 via Web Crypto API (sem dependência externa). */
  static generate(): LeadId;

  /** Aceita UUID v4 válido. Lança LeadIdInvalidError. */
  static fromString(value: string): LeadId;

  getValue(): string;
  equals(other: LeadId): boolean;
}
```

```typescript
// domain/lead/value-objects/business-name.vo.ts
export class BusinessName {
  private constructor(private readonly value: string) {}

  /**
   * Aceita string com 2–120 caracteres após trim.
   * Lança BusinessNameInvalidError.
   */
  static create(raw: string): BusinessName;

  getValue(): string;
  equals(other: BusinessName): boolean;
}
```

```typescript
// domain/lead/value-objects/sector.vo.ts
export type SectorValue =
  | 'Clínicas & Consultórios'
  | 'Salões & Barbearias'
  | 'Oficinas Mecânicas'
  | 'Restaurantes'
  | 'Advocacia'
  | 'Contabilidade'
  | 'Academias & Estúdios'
  | 'Serviços Domésticos'
  | 'Igrejas & Ministérios'
  | 'Escolas & Cursos';

export class Sector {
  private constructor(private readonly value: SectorValue) {}

  /** Lista canônica imutável dos 10 setores suportados no MVP. */
  static readonly ALL: readonly SectorValue[];

  /** Aceita apenas valores de SectorValue. Lança SectorInvalidError. */
  static create(value: string): Sector;

  getValue(): SectorValue;
  equals(other: Sector): boolean;
}
```

> **Nota:** Ícone e search query (ex: `"clínica consultório"`) **não** vivem no domain. São metadata da infrastructure/presentation.

```typescript
// domain/lead/value-objects/lead-status.vo.ts
export type LeadStatusValue =
  | 'novo'
  | 'contatado'
  | 'proposta'
  | 'fechado'
  | 'descartado';

export class LeadStatus {
  private constructor(private readonly value: LeadStatusValue) {}

  static create(value: string): LeadStatus;

  /** Conveniências para evitar typos em código de domínio. */
  static novo(): LeadStatus;
  static contatado(): LeadStatus;
  static proposta(): LeadStatus;
  static fechado(): LeadStatus;
  static descartado(): LeadStatus;

  getValue(): LeadStatusValue;

  /**
   * Encapsula a tabela VALID_TRANSITIONS do JSX:
   *   novo       → [contatado, descartado]
   *   contatado  → [proposta, novo, descartado]
   *   proposta   → [fechado, contatado, descartado]
   *   fechado    → [proposta]
   *   descartado → [novo]
   */
  canTransitionTo(target: LeadStatus): boolean;

  equals(other: LeadStatus): boolean;
}
```

```typescript
// domain/lead/value-objects/phone-number.vo.ts
export class PhoneNumber {
  private constructor(private readonly digits: string) {}

  /**
   * Normaliza removendo não-dígitos. Valida 10 ou 11 dígitos (DDD + número BR),
   * com ou sem DDI 55 (que é descartado e re-aplicado quando necessário).
   * Lança PhoneNumberInvalidError.
   */
  static create(raw: string): PhoneNumber;

  /** Apenas dígitos, sem DDI. Ex: "21999990001" */
  getValue(): string;

  /** Formato visual. Ex: "(21) 99999-0001" */
  getFormatted(): string;

  /** Com DDI 55 pré-fixado, para wa.me. Ex: "5521999990001" */
  toWhatsAppDigits(): string;

  equals(other: PhoneNumber): boolean;
}
```

```typescript
// domain/lead/value-objects/email.vo.ts
export class Email {
  private constructor(private readonly value: string) {}

  /**
   * Aceita formato RFC 5322 simplificado, lowercase normalizado.
   * Lança EmailInvalidError.
   */
  static create(raw: string): Email;

  getValue(): string;
  equals(other: Email): boolean;
}
```

```typescript
// domain/lead/value-objects/location.vo.ts
export interface LocationInput {
  readonly city: string;
  readonly address?: string | null;
}

export class Location {
  private constructor(
    private readonly cityValue: string,
    private readonly addressValue: string | null,
  ) {}

  /**
   * city obrigatório (2–80 chars após trim).
   * address opcional (até 200 chars).
   * Lança LocationInvalidError.
   */
  static create(input: LocationInput): Location;

  getCity(): string;
  getAddress(): string | null;

  /** Comparação canônica usada na detecção de duplicatas: lowercase + trim. */
  getCityNormalized(): string;

  equals(other: Location): boolean;
}
```

```typescript
// domain/lead/value-objects/contact-info.vo.ts
export interface ContactInfoInput {
  readonly phone?: PhoneNumber | null;
  readonly email?: Email | null;
}

export class ContactInfo {
  private constructor(
    private readonly phoneValue: PhoneNumber | null,
    private readonly emailValue: Email | null,
  ) {}

  /**
   * Regra do JSX (linha 202): pelo menos um entre phone e email é obrigatório.
   * Lança ContactInfoEmptyError se ambos forem null/undefined.
   */
  static create(input: ContactInfoInput): ContactInfo;

  getPhone(): PhoneNumber | null;
  getEmail(): Email | null;
  hasPhone(): boolean;
  hasEmail(): boolean;
  equals(other: ContactInfo): boolean;
}
```

#### 2.1.3 Entity Lead (Aggregate Root)

```typescript
// domain/lead/entities/lead.entity.ts
import { LeadId } from '../value-objects/lead-id.vo';
import { BusinessName } from '../value-objects/business-name.vo';
import { Sector } from '../value-objects/sector.vo';
import { Location } from '../value-objects/location.vo';
import { ContactInfo } from '../value-objects/contact-info.vo';
import { LeadStatus } from '../value-objects/lead-status.vo';
import { DomainEvent } from '../../shared/events/domain-event.base';

export type ContactChannel = 'whatsapp' | 'email';

export interface LeadCreateInput {
  readonly businessName: BusinessName;
  readonly sector: Sector;
  readonly location: Location;
  readonly contactInfo: ContactInfo;
  readonly rating?: number | null;   // 0–5 quando presente, validado
  readonly hasWebsite?: boolean;     // default false
}

/** Snapshot completo usado pelo repositório para hidratar a entidade. */
export interface LeadSnapshot {
  readonly id: LeadId;
  readonly businessName: BusinessName;
  readonly sector: Sector;
  readonly location: Location;
  readonly contactInfo: ContactInfo;
  readonly status: LeadStatus;
  readonly notes: string;
  readonly rating: number | null;
  readonly contactCount: number;
  readonly lastContactAt: Date | null;
  readonly hasWebsite: boolean;
  readonly createdAt: Date;
}

export class Lead {
  private constructor(
    private readonly _id: LeadId,
    private readonly _businessName: BusinessName,
    private readonly _sector: Sector,
    private readonly _location: Location,
    private readonly _contactInfo: ContactInfo,
    private _status: LeadStatus,
    private _notes: string,
    private readonly _rating: number | null,
    private _contactCount: number,
    private _lastContactAt: Date | null,
    private readonly _hasWebsite: boolean,
    private readonly _createdAt: Date,
    private readonly _events: DomainEvent[],
  ) {}

  /**
   * Cria novo Lead com status inicial 'novo'.
   * Emite LeadCreatedEvent.
   * Valida rating (se presente): 0 ≤ rating ≤ 5.
   * Lança LeadRatingInvalidError se rating fora do intervalo.
   */
  static create(input: LeadCreateInput): Lead;

  /** Hidrata a entidade a partir do snapshot do repositório SEM emitir eventos. */
  static reconstitute(snapshot: LeadSnapshot): Lead;

  // ── Getters readonly ──────────────────────────────────────────────────
  get id(): LeadId;
  get businessName(): BusinessName;
  get sector(): Sector;
  get location(): Location;
  get contactInfo(): ContactInfo;
  get status(): LeadStatus;
  get notes(): string;
  get rating(): number | null;
  get contactCount(): number;
  get lastContactAt(): Date | null;
  get hasWebsite(): boolean;
  get createdAt(): Date;

  // ── Comportamentos ────────────────────────────────────────────────────

  /**
   * Move o lead para outro status.
   * Lança InvalidStatusTransitionError se a transição não for permitida.
   * Emite LeadStatusChangedEvent.
   */
  changeStatus(newStatus: LeadStatus): void;

  /**
   * Registra um contato realizado.
   * Lança LeadMissingContactChannelError se contactInfo não tiver o canal.
   * Incrementa contactCount, atualiza lastContactAt.
   * Auto-transiciona de 'novo' para 'contatado' (regra do JSX linha 178/191).
   * Emite LeadContactedEvent e, se houve auto-transição, LeadStatusChangedEvent.
   */
  registerContact(channel: ContactChannel, at: Date): void;

  /** Atualiza notas internas. Aceita string vazia (limpar). Max 2000 chars. */
  updateNotes(notes: string): void;

  /**
   * Retorna true se status='contatado' e (now - lastContactAt) >= thresholdDays.
   * Regra extraída do JSX linha 548 (isStale = contatado há ≥ 3d sem retorno).
   * Recebe `now` por parâmetro para manter o domain puro (sem Date.now() interno).
   */
  isStale(now: Date, thresholdDays: number): boolean;

  // ── Eventos ───────────────────────────────────────────────────────────

  /** Retorna eventos acumulados e limpa o buffer. Chamado pelo repositório/use case. */
  pullEvents(): readonly DomainEvent[];
}
```

#### 2.1.4 Domain Events

```typescript
// domain/lead/events/lead-created.event.ts
import { DomainEvent } from '../../shared/events/domain-event.base';
import { LeadId } from '../value-objects/lead-id.vo';
import { BusinessName } from '../value-objects/business-name.vo';
import { Sector } from '../value-objects/sector.vo';

export class LeadCreatedEvent extends DomainEvent {
  readonly eventName = 'LeadCreated' as const;

  constructor(
    readonly leadId: LeadId,
    readonly businessName: BusinessName,
    readonly sector: Sector,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}
```

```typescript
// domain/lead/events/lead-status-changed.event.ts
import { DomainEvent } from '../../shared/events/domain-event.base';
import { LeadId } from '../value-objects/lead-id.vo';
import { LeadStatus } from '../value-objects/lead-status.vo';

export class LeadStatusChangedEvent extends DomainEvent {
  readonly eventName = 'LeadStatusChanged' as const;

  constructor(
    readonly leadId: LeadId,
    readonly from: LeadStatus,
    readonly to: LeadStatus,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}
```

```typescript
// domain/lead/events/lead-contacted.event.ts
import { DomainEvent } from '../../shared/events/domain-event.base';
import { LeadId } from '../value-objects/lead-id.vo';
import { ContactChannel } from '../entities/lead.entity';

export class LeadContactedEvent extends DomainEvent {
  readonly eventName = 'LeadContacted' as const;

  constructor(
    readonly leadId: LeadId,
    readonly channel: ContactChannel,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}
```

### 2.2 Repository Interface

```typescript
// domain/lead/repositories/lead.repository.ts
import { Lead } from '../entities/lead.entity';
import { LeadId } from '../value-objects/lead-id.vo';
import { LeadStatus } from '../value-objects/lead-status.vo';
import { Sector } from '../value-objects/sector.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';

export type LeadSortField =
  | 'createdAt'
  | 'rating'
  | 'contactCount'
  | 'lastContactAt';

export type SortOrder = 'asc' | 'desc';

export interface LeadFilter {
  readonly status?: LeadStatus;
  readonly sector?: Sector;
  readonly city?: string;
  readonly hasWebsite?: boolean;

  /** Busca textual em businessName | city | sector (case-insensitive). */
  readonly textQuery?: string;

  readonly sortBy?: LeadSortField;
  readonly sortOrder?: SortOrder;
  readonly limit?: number;
  readonly offset?: number;
}

export interface LeadStatsByStatus {
  readonly total: number;
  readonly novo: number;
  readonly contatado: number;
  readonly proposta: number;
  readonly fechado: number;
  readonly descartado: number;
}

export interface LeadRepository {
  /** Insert ou update (upsert por id). Persiste estado e despacha eventos pendentes. */
  save(lead: Lead): Promise<void>;

  /** Retorna null se não encontrado (não lança). */
  findById(id: LeadId): Promise<Lead | null>;

  /** Retorna lista (vazia se nada bater no filtro). */
  findAll(filter?: LeadFilter): Promise<readonly Lead[]>;

  /**
   * Constraint de duplicata do JSX (linhas 72–76 e 203):
   * mesmo phone normalizado (só dígitos) + mesma city (lowercase) ⇒ duplicata.
   */
  existsByPhoneAndCity(phone: PhoneNumber, city: string): Promise<boolean>;

  /** Lança LeadNotFoundError se não existir. */
  delete(id: LeadId): Promise<void>;

  count(filter?: LeadFilter): Promise<number>;

  /** Agregação usada na barra de stats da view pipeline. */
  statsByStatus(): Promise<LeadStatsByStatus>;
}
```

### 2.3 Service Interfaces (Domain)

```typescript
// domain/lead/services/place-finder.service.ts
import { Sector } from '../value-objects/sector.vo';

export interface PlaceFinderQuery {
  readonly sector: Sector;
  readonly city: string;
}

/**
 * Dados crus retornados pelo provider externo (Google Places via Edge Function).
 * Ainda NÃO são uma Lead — o use case valida, converte para VOs e checa duplicatas.
 */
export interface PlaceFinderResult {
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly rating: number | null;
  readonly address: string | null;
  readonly hasWebsite: boolean;
}

export interface PlaceFinderService {
  /**
   * Lança PlaceFinderUnavailableError em falha de rede/auth da Edge Function.
   * Retorna array vazio se a busca foi bem-sucedida mas não trouxe resultados.
   */
  search(query: PlaceFinderQuery): Promise<readonly PlaceFinderResult[]>;
}
```

```typescript
// domain/lead/services/contact-dispatcher.service.ts
import { ContactChannel } from '../entities/lead.entity';

export interface RenderedMessage {
  /** Null para WhatsApp (wa.me não suporta subject). */
  readonly subject: string | null;
  readonly body: string;
}

export interface WhatsAppDispatchInput {
  readonly phoneWhatsAppDigits: string;  // já com DDI 55, pronto para wa.me
  readonly message: RenderedMessage;
}

export interface EmailDispatchInput {
  readonly to: string;
  readonly message: RenderedMessage;
}

export interface DispatchResult {
  readonly url: string;
}

export interface ContactDispatcherService {
  /**
   * Dispara wa.me em nova aba. Operação síncrona (apenas abre URL no browser).
   * Lança DispatchFailedError se o ambiente não suportar window.open.
   * Retorna { url } gerada — facilita testes e logs.
   */
  dispatchWhatsApp(input: WhatsAppDispatchInput): DispatchResult;

  /** Dispara mailto:. Mesmas garantias do dispatchWhatsApp. */
  dispatchEmail(input: EmailDispatchInput): DispatchResult;
}
```

```typescript
// domain/lead/services/message-template.service.ts
import { ContactChannel } from '../entities/lead.entity';

export interface MessageTemplate {
  readonly channel: ContactChannel;
  /** Null para WhatsApp. Pode conter placeholders. */
  readonly subject: string | null;
  /** Suporta placeholders: {{nome}}, {{setor}}, {{cidade}}. */
  readonly body: string;
}

export interface MessageTemplateVariables {
  readonly nome: string;
  readonly setor: string;
  readonly cidade: string;
}

export interface RenderedMessage {
  readonly subject: string | null;
  readonly body: string;
}

export interface MessageTemplateService {
  /** Retorna o template ativo para o canal. */
  getTemplate(channel: ContactChannel): MessageTemplate;

  /** Substitui placeholders. Placeholders desconhecidos permanecem literais. */
  render(template: MessageTemplate, vars: MessageTemplateVariables): RenderedMessage;
}
```

### 2.4 Use Case DTOs e Skeletons

#### 2.4.0 Base compartilhada

```typescript
// application/shared/use-case.interface.ts
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
```

```typescript
// application/shared/result.ts
/**
 * Result discriminado para operações em lote onde itens individuais podem
 * falhar sem abortar o conjunto. Use cases atômicos NÃO usam Result — lançam
 * DomainError diretamente.
 */
export type Result<T, E> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'err'; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { kind: 'ok', value };
  },
  err<E>(error: E): Result<never, E> {
    return { kind: 'err', error };
  },
} as const;
```

#### 2.4.1 LeadDto compartilhado

```typescript
// application/lead/dtos/lead.dto.ts
import { LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';

/**
 * Shape primitivo consumido pela Presentation. Sem instâncias de VO ou Date —
 * tudo string/number/null para serialização trivial e isolamento da camada.
 */
export interface LeadDto {
  readonly id: string;
  readonly businessName: string;
  readonly sector: string;
  readonly city: string;
  readonly address: string | null;
  readonly phone: string | null;            // formatado: "(21) 99999-0001"
  readonly phoneDigits: string | null;      // só dígitos: "21999990001"
  readonly email: string | null;
  readonly status: LeadStatusValue;
  readonly notes: string;
  readonly rating: number | null;
  readonly contactCount: number;
  readonly lastContactAtIso: string | null;
  readonly hasWebsite: boolean;
  readonly createdAtIso: string;
}
```

```typescript
// application/lead/dtos/lead.mapper.ts
import { Lead } from '@domain/lead/entities/lead.entity';
import { LeadDto } from './lead.dto';

export class LeadMapper {
  /** Lead entity → DTO primitivo. */
  static toDto(lead: Lead): LeadDto;
}
```

#### 2.4.2 SearchLeads

```typescript
// application/lead/use-cases/search-leads/search-leads.input.dto.ts
export interface SearchLeadsInput {
  readonly sector: string;   // valor canônico de SectorValue
  readonly city: string;
}
```

```typescript
// application/lead/use-cases/search-leads/search-leads.output.dto.ts
import { LeadDto } from '../../dtos/lead.dto';

export type SearchLeadsItemStatus =
  | 'added'
  | 'skipped_duplicate'
  | 'skipped_invalid'
  | 'skipped_has_website';

export interface SearchLeadsResultItem {
  readonly itemStatus: SearchLeadsItemStatus;
  readonly placeName: string;
  readonly lead: LeadDto | null;        // presente se itemStatus='added'
  readonly skipReason: string | null;   // presente se skipped_*
}

export interface SearchLeadsOutput {
  readonly totalFound: number;
  readonly addedCount: number;
  readonly skippedDuplicates: number;
  readonly skippedInvalid: number;
  readonly skippedWithWebsite: number;
  readonly items: readonly SearchLeadsResultItem[];
}
```

```typescript
// application/lead/use-cases/search-leads/search-leads.use-case.ts
import { UseCase } from '@application/shared/use-case.interface';
import { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { PlaceFinderService } from '@domain/lead/services/place-finder.service';
import { SearchLeadsInput } from './search-leads.input.dto';
import { SearchLeadsOutput } from './search-leads.output.dto';

export class SearchLeadsUseCase
  implements UseCase<SearchLeadsInput, SearchLeadsOutput>
{
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly placeFinder: PlaceFinderService,
  ) {}

  /**
   * Orquestração:
   * 1. Sector.create(input.sector) — lança SectorInvalidError
   * 2. placeFinder.search({ sector, city }) — propaga PlaceFinderUnavailableError
   * 3. Para cada PlaceFinderResult:
   *    a. Se hasWebsite=true → itemStatus='skipped_has_website'
   *    b. Tenta construir Location, ContactInfo, BusinessName via VOs.
   *       Qualquer DomainError em VO → itemStatus='skipped_invalid' com reason
   *    c. Se phone presente: leadRepository.existsByPhoneAndCity(phone, city)
   *       Se true → itemStatus='skipped_duplicate'
   *    d. Lead.create({ ... }) + leadRepository.save(lead) → itemStatus='added'
   * 4. Retorna SearchLeadsOutput com contadores e items granular.
   */
  execute(input: SearchLeadsInput): Promise<SearchLeadsOutput>;
}
```

#### 2.4.3 CreateLead

```typescript
// application/lead/use-cases/create-lead/create-lead.input.dto.ts
export interface CreateLeadInput {
  readonly businessName: string;
  readonly sector: string;
  readonly city: string;
  readonly address?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly rating?: number | null;
  readonly hasWebsite?: boolean;
}
```

```typescript
// application/lead/use-cases/create-lead/create-lead.output.dto.ts
import { LeadDto } from '../../dtos/lead.dto';

export interface CreateLeadOutput {
  readonly lead: LeadDto;
}
```

```typescript
// application/lead/use-cases/create-lead/create-lead.use-case.ts
import { UseCase } from '@application/shared/use-case.interface';
import { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { CreateLeadInput } from './create-lead.input.dto';
import { CreateLeadOutput } from './create-lead.output.dto';

export class CreateLeadUseCase
  implements UseCase<CreateLeadInput, CreateLeadOutput>
{
  constructor(private readonly leadRepository: LeadRepository) {}

  /**
   * Orquestração:
   * 1. Constrói VOs: BusinessName, Sector, Location, PhoneNumber?, Email?, ContactInfo
   *    Qualquer falha propaga o DomainError respectivo.
   * 2. Se contactInfo.hasPhone(): leadRepository.existsByPhoneAndCity()
   *    Se duplicata → lança DuplicateLeadError.
   * 3. Lead.create({ ... }) + leadRepository.save(lead)
   * 4. Retorna { lead: LeadMapper.toDto(lead) }
   */
  execute(input: CreateLeadInput): Promise<CreateLeadOutput>;
}
```

#### 2.4.4 UpdateLeadStatus

```typescript
// application/lead/use-cases/update-lead-status/update-lead-status.input.dto.ts
export interface UpdateLeadStatusInput {
  readonly leadId: string;
  readonly newStatus: string;   // valor canônico de LeadStatusValue
}
```

```typescript
// application/lead/use-cases/update-lead-status/update-lead-status.output.dto.ts
import { LeadDto } from '../../dtos/lead.dto';

export interface UpdateLeadStatusOutput {
  readonly lead: LeadDto;
}
```

```typescript
// application/lead/use-cases/update-lead-status/update-lead-status.use-case.ts
export class UpdateLeadStatusUseCase
  implements UseCase<UpdateLeadStatusInput, UpdateLeadStatusOutput>
{
  constructor(private readonly leadRepository: LeadRepository) {}

  /**
   * 1. LeadId.fromString(input.leadId) — lança LeadIdInvalidError
   * 2. leadRepository.findById(leadId) — lança LeadNotFoundError se null
   * 3. LeadStatus.create(input.newStatus) — lança LeadStatusInvalidError
   * 4. lead.changeStatus(newStatus) — lança InvalidStatusTransitionError
   * 5. leadRepository.save(lead)
   * 6. Retorna { lead: LeadMapper.toDto(lead) }
   */
  execute(input: UpdateLeadStatusInput): Promise<UpdateLeadStatusOutput>;
}
```

#### 2.4.5 DeleteLead

```typescript
// application/lead/use-cases/delete-lead/delete-lead.input.dto.ts
export interface DeleteLeadInput {
  readonly leadId: string;
}
```

```typescript
// application/lead/use-cases/delete-lead/delete-lead.output.dto.ts
export interface DeleteLeadOutput {
  readonly leadId: string;
  readonly deletedAtIso: string;
}
```

```typescript
// application/lead/use-cases/delete-lead/delete-lead.use-case.ts
export class DeleteLeadUseCase
  implements UseCase<DeleteLeadInput, DeleteLeadOutput>
{
  constructor(private readonly leadRepository: LeadRepository) {}

  /**
   * 1. LeadId.fromString(input.leadId)
   * 2. leadRepository.delete(leadId) — lança LeadNotFoundError se não existir
   * 3. Retorna { leadId, deletedAtIso: ISO de Date.now() }
   */
  execute(input: DeleteLeadInput): Promise<DeleteLeadOutput>;
}
```

#### 2.4.6 SendWhatsApp

```typescript
// application/lead/use-cases/send-whatsapp/send-whatsapp.input.dto.ts
export interface SendWhatsAppInput {
  readonly leadId: string;
}
```

```typescript
// application/lead/use-cases/send-whatsapp/send-whatsapp.output.dto.ts
import { LeadDto } from '../../dtos/lead.dto';

export interface SendWhatsAppOutput {
  readonly lead: LeadDto;
  readonly dispatchedUrl: string;
}
```

```typescript
// application/lead/use-cases/send-whatsapp/send-whatsapp.use-case.ts
import { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { ContactDispatcherService } from '@domain/lead/services/contact-dispatcher.service';
import { MessageTemplateService } from '@domain/lead/services/message-template.service';

export class SendWhatsAppUseCase
  implements UseCase<SendWhatsAppInput, SendWhatsAppOutput>
{
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly contactDispatcher: ContactDispatcherService,
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * 1. LeadId.fromString(input.leadId)
   * 2. leadRepository.findById(leadId) — lança LeadNotFoundError
   * 3. Se !lead.contactInfo.hasPhone() — lança LeadMissingContactChannelError
   * 4. template = messageTemplateService.getTemplate('whatsapp')
   * 5. rendered = messageTemplateService.render(template, { nome, setor, cidade })
   * 6. dispatchResult = contactDispatcher.dispatchWhatsApp({
   *      phoneWhatsAppDigits: lead.contactInfo.getPhone()!.toWhatsAppDigits(),
   *      message: rendered,
   *    })
   * 7. lead.registerContact('whatsapp', new Date()) — emite eventos no domain
   * 8. leadRepository.save(lead)
   * 9. Retorna { lead: LeadMapper.toDto(lead), dispatchedUrl: dispatchResult.url }
   */
  execute(input: SendWhatsAppInput): Promise<SendWhatsAppOutput>;
}
```

#### 2.4.7 SendEmail

```typescript
// application/lead/use-cases/send-email/send-email.input.dto.ts
export interface SendEmailInput {
  readonly leadId: string;
}
```

```typescript
// application/lead/use-cases/send-email/send-email.output.dto.ts
import { LeadDto } from '../../dtos/lead.dto';

export interface SendEmailOutput {
  readonly lead: LeadDto;
  readonly dispatchedUrl: string;   // mailto: URL
}
```

```typescript
// application/lead/use-cases/send-email/send-email.use-case.ts
export class SendEmailUseCase
  implements UseCase<SendEmailInput, SendEmailOutput>
{
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly contactDispatcher: ContactDispatcherService,
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Espelha SendWhatsAppUseCase trocando:
   *  - canal: 'email'
   *  - validação: !hasEmail() → LeadMissingContactChannelError('email')
   *  - dispatcher: dispatchEmail({ to: email.getValue(), message })
   *  - template: getTemplate('email') (com subject não-nulo)
   *  - registerContact('email', new Date())
   */
  execute(input: SendEmailInput): Promise<SendEmailOutput>;
}
```

#### 2.4.8 Tokens de Injeção

```typescript
// application/lead/tokens/lead-repository.token.ts
import { InjectionToken } from '@angular/core';
import { LeadRepository } from '@domain/lead/repositories/lead.repository';

export const LEAD_REPOSITORY = new InjectionToken<LeadRepository>(
  'LEAD_REPOSITORY',
);
```

```typescript
// application/lead/tokens/place-finder.token.ts
import { InjectionToken } from '@angular/core';
import { PlaceFinderService } from '@domain/lead/services/place-finder.service';

export const PLACE_FINDER = new InjectionToken<PlaceFinderService>(
  'PLACE_FINDER',
);
```

```typescript
// application/lead/tokens/contact-dispatcher.token.ts
import { InjectionToken } from '@angular/core';
import { ContactDispatcherService } from '@domain/lead/services/contact-dispatcher.service';

export const CONTACT_DISPATCHER = new InjectionToken<ContactDispatcherService>(
  'CONTACT_DISPATCHER',
);
```

```typescript
// application/lead/tokens/message-template.token.ts
import { InjectionToken } from '@angular/core';
import { MessageTemplateService } from '@domain/lead/services/message-template.service';

export const MESSAGE_TEMPLATE = new InjectionToken<MessageTemplateService>(
  'MESSAGE_TEMPLATE',
);
```

> **Justificativa do compromisso:** Tokens vivem em Application (não em Domain) porque importam `@angular/core`. Domain fica 100% framework-free. Application aceita esse acoplamento mínimo a Angular — é a ponte natural entre o framework e o núcleo do negócio.

### 2.5 Error Classes

```typescript
// domain/lead/errors/*.error.ts
import { DomainError } from '../../shared/errors/domain-error.base';

// ── Erros de Value Objects ────────────────────────────────────────────────

export class LeadIdInvalidError extends DomainError {
  readonly code = 'LEAD_ID_INVALID';
  constructor(value: string) {
    super(`LeadId inválido: "${value}". Esperado UUID v4.`);
  }
}

export class BusinessNameInvalidError extends DomainError {
  readonly code = 'BUSINESS_NAME_INVALID';
  constructor(reason: 'EMPTY' | 'TOO_SHORT' | 'TOO_LONG') {
    super(`Nome do negócio inválido: ${reason}.`);
  }
}

export class SectorInvalidError extends DomainError {
  readonly code = 'SECTOR_INVALID';
  constructor(value: string) {
    super(`Setor "${value}" não está na lista canônica.`);
  }
}

export class LeadStatusInvalidError extends DomainError {
  readonly code = 'LEAD_STATUS_INVALID';
  constructor(value: string) {
    super(`Status "${value}" não é um LeadStatus válido.`);
  }
}

export class PhoneNumberInvalidError extends DomainError {
  readonly code = 'PHONE_NUMBER_INVALID';
  constructor(reason: 'EMPTY' | 'WRONG_LENGTH' | 'NON_NUMERIC') {
    super(`Telefone inválido: ${reason}.`);
  }
}

export class EmailInvalidError extends DomainError {
  readonly code = 'EMAIL_INVALID';
  constructor(value: string) {
    super(`E-mail inválido: "${value}".`);
  }
}

export class LocationInvalidError extends DomainError {
  readonly code = 'LOCATION_INVALID';
  constructor(field: 'CITY' | 'ADDRESS', reason: string) {
    super(`Localização inválida em ${field}: ${reason}.`);
  }
}

export class ContactInfoEmptyError extends DomainError {
  readonly code = 'CONTACT_INFO_EMPTY';
  constructor() {
    super('ContactInfo precisa de pelo menos telefone OU e-mail.');
  }
}

// ── Erros da Entity Lead ──────────────────────────────────────────────────

export class LeadRatingInvalidError extends DomainError {
  readonly code = 'LEAD_RATING_INVALID';
  constructor(readonly value: number) {
    super(`Rating ${value} fora do intervalo permitido (0–5).`);
  }
}

export class LeadNotesTooLongError extends DomainError {
  readonly code = 'LEAD_NOTES_TOO_LONG';
  constructor(readonly length: number, readonly max: number) {
    super(`Notas com ${length} caracteres excedem o limite de ${max}.`);
  }
}

export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';
  constructor(readonly from: string, readonly to: string) {
    super(`Transição inválida: ${from} → ${to}.`);
  }
}

export class LeadMissingContactChannelError extends DomainError {
  readonly code = 'LEAD_MISSING_CONTACT_CHANNEL';
  constructor(readonly leadId: string, readonly channel: 'whatsapp' | 'email') {
    super(
      `Lead ${leadId} não possui ${
        channel === 'whatsapp' ? 'telefone' : 'e-mail'
      } cadastrado.`,
    );
  }
}

// ── Erros do Repositório / Aggregate ──────────────────────────────────────

export class LeadNotFoundError extends DomainError {
  readonly code = 'LEAD_NOT_FOUND';
  constructor(readonly leadId: string) {
    super(`Lead ${leadId} não encontrado.`);
  }
}

export class DuplicateLeadError extends DomainError {
  readonly code = 'DUPLICATE_LEAD';
  constructor(readonly phone: string, readonly city: string) {
    super(`Já existe lead com telefone ${phone} em ${city}.`);
  }
}

// ── Erros dos Domain Services ─────────────────────────────────────────────

export class PlaceFinderUnavailableError extends DomainError {
  readonly code = 'PLACE_FINDER_UNAVAILABLE';
  constructor(readonly cause: string) {
    super(`Provider de busca indisponível: ${cause}.`);
  }
}

export class DispatchFailedError extends DomainError {
  readonly code = 'DISPATCH_FAILED';
  constructor(readonly channel: 'whatsapp' | 'email', readonly cause: string) {
    super(`Falha ao despachar via ${channel}: ${cause}.`);
  }
}
```

---

## 3. Mapa de Dependências

Convenções da tabela:
- `(stdlib)` = só TypeScript / Web APIs
- `(angular)` = `@angular/core` ou pacotes do framework
- `(supabase-js)` = `@supabase/supabase-js`
- `(ngrx-signals)` = `@ngrx/signals`
- `→ X` indica importação. Imports são **only-type** quando o consumidor não instancia (interfaces, tipos).
- Specs (`*.spec.ts`) sempre importam o arquivo testado + Jest + mocks; omitidos da tabela para concisão.

### 3.1 Domain (zero deps externas)

| Arquivo | Importa de |
|---|---|
| `domain/shared/errors/domain-error.base.ts` | (stdlib) |
| `domain/shared/events/domain-event.base.ts` | (stdlib) |
| `domain/lead/errors/lead-id-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/business-name-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/sector-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/lead-status-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/phone-number-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/email-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/location-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/contact-info-empty.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/lead-rating-invalid.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/lead-notes-too-long.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/invalid-status-transition.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/lead-not-found.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/duplicate-lead.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/lead-missing-contact-channel.error.ts` | `domain/shared/errors/domain-error.base`, `domain/lead/entities/lead.entity` (type-only — `ContactChannel`) |
| `domain/lead/errors/place-finder-unavailable.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/errors/dispatch-failed.error.ts` | `domain/shared/errors/domain-error.base` |
| `domain/lead/value-objects/lead-id.vo.ts` | `domain/lead/errors/lead-id-invalid.error`, (Web Crypto via `globalThis.crypto`) |
| `domain/lead/value-objects/business-name.vo.ts` | `domain/lead/errors/business-name-invalid.error` |
| `domain/lead/value-objects/sector.vo.ts` | `domain/lead/errors/sector-invalid.error` |
| `domain/lead/value-objects/lead-status.vo.ts` | `domain/lead/errors/lead-status-invalid.error` |
| `domain/lead/value-objects/phone-number.vo.ts` | `domain/lead/errors/phone-number-invalid.error` |
| `domain/lead/value-objects/email.vo.ts` | `domain/lead/errors/email-invalid.error` |
| `domain/lead/value-objects/location.vo.ts` | `domain/lead/errors/location-invalid.error` |
| `domain/lead/value-objects/contact-info.vo.ts` | `phone-number.vo`, `email.vo`, `contact-info-empty.error` |
| `domain/lead/events/lead-created.event.ts` | `domain/shared/events/domain-event.base`, `lead-id.vo`, `business-name.vo`, `sector.vo` (type-only) |
| `domain/lead/events/lead-status-changed.event.ts` | `domain/shared/events/domain-event.base`, `lead-id.vo`, `lead-status.vo` (type-only) |
| `domain/lead/events/lead-contacted.event.ts` | `domain/shared/events/domain-event.base`, `lead-id.vo` (type-only), `lead.entity` (type-only — `ContactChannel`) |
| `domain/lead/entities/lead.entity.ts` | todas as 8 VOs, todos os 3 events, `lead-rating-invalid.error`, `lead-notes-too-long.error`, `invalid-status-transition.error`, `lead-missing-contact-channel.error`, `domain/shared/events/domain-event.base` |
| `domain/lead/repositories/lead.repository.ts` | `lead.entity` (type-only), `lead-id.vo` (type-only), `lead-status.vo` (type-only), `sector.vo` (type-only), `phone-number.vo` (type-only) |
| `domain/lead/services/place-finder.service.ts` | `sector.vo` (type-only) |
| `domain/lead/services/contact-dispatcher.service.ts` | (stdlib — apenas tipos próprios) |
| `domain/lead/services/message-template.service.ts` | `lead.entity` (type-only — `ContactChannel`) |
| `domain/lead/index.ts` | barril: reexporta entity, VOs, events, repository interface, service interfaces, errors |
| `domain/shared/index.ts` | barril: reexporta `domain-error.base`, `domain-event.base` |

### 3.2 Application

| Arquivo | Importa de |
|---|---|
| `application/shared/use-case.interface.ts` | (stdlib) |
| `application/shared/result.ts` | (stdlib) |
| `application/shared/index.ts` | barril |
| `application/lead/dtos/lead.dto.ts` | `@domain/lead/value-objects/lead-status.vo` (type-only — `LeadStatusValue`) |
| `application/lead/dtos/lead.mapper.ts` | `@domain/lead/entities/lead.entity`, `./lead.dto` |
| `application/lead/use-cases/search-leads/search-leads.input.dto.ts` | (stdlib) |
| `application/lead/use-cases/search-leads/search-leads.output.dto.ts` | `../../dtos/lead.dto` |
| `application/lead/use-cases/search-leads/search-leads.use-case.ts` | `@application/shared/use-case.interface`, `@domain/lead/repositories/lead.repository`, `@domain/lead/services/place-finder.service`, `@domain/lead/entities/lead.entity`, `@domain/lead/value-objects/{sector,business-name,phone-number,email,location,contact-info}.vo`, `@domain/lead/errors/*`, `../../dtos/lead.mapper`, `./search-leads.input.dto`, `./search-leads.output.dto` |
| `application/lead/use-cases/create-lead/create-lead.input.dto.ts` | (stdlib) |
| `application/lead/use-cases/create-lead/create-lead.output.dto.ts` | `../../dtos/lead.dto` |
| `application/lead/use-cases/create-lead/create-lead.use-case.ts` | `@application/shared/use-case.interface`, `@domain/lead/repositories/lead.repository`, `@domain/lead/entities/lead.entity`, todas as VOs relevantes, `@domain/lead/errors/duplicate-lead.error`, `../../dtos/lead.mapper`, I/O DTOs |
| `application/lead/use-cases/update-lead-status/update-lead-status.input.dto.ts` | (stdlib) |
| `application/lead/use-cases/update-lead-status/update-lead-status.output.dto.ts` | `../../dtos/lead.dto` |
| `application/lead/use-cases/update-lead-status/update-lead-status.use-case.ts` | `@application/shared/use-case.interface`, `@domain/lead/repositories/lead.repository`, `@domain/lead/value-objects/{lead-id,lead-status}.vo`, errors, mapper, I/O DTOs |
| `application/lead/use-cases/delete-lead/delete-lead.input.dto.ts` | (stdlib) |
| `application/lead/use-cases/delete-lead/delete-lead.output.dto.ts` | (stdlib) |
| `application/lead/use-cases/delete-lead/delete-lead.use-case.ts` | `@application/shared/use-case.interface`, `@domain/lead/repositories/lead.repository`, `@domain/lead/value-objects/lead-id.vo`, I/O DTOs |
| `application/lead/use-cases/send-whatsapp/send-whatsapp.input.dto.ts` | (stdlib) |
| `application/lead/use-cases/send-whatsapp/send-whatsapp.output.dto.ts` | `../../dtos/lead.dto` |
| `application/lead/use-cases/send-whatsapp/send-whatsapp.use-case.ts` | `@application/shared/use-case.interface`, `@domain/lead/repositories/lead.repository`, `@domain/lead/services/contact-dispatcher.service`, `@domain/lead/services/message-template.service`, `@domain/lead/value-objects/lead-id.vo`, errors, mapper, I/O DTOs |
| `application/lead/use-cases/send-email/send-email.input.dto.ts` | (stdlib) |
| `application/lead/use-cases/send-email/send-email.output.dto.ts` | `../../dtos/lead.dto` |
| `application/lead/use-cases/send-email/send-email.use-case.ts` | igual ao SendWhatsApp |
| `application/lead/tokens/lead-repository.token.ts` | (angular: `InjectionToken`), `@domain/lead/repositories/lead.repository` (type-only) |
| `application/lead/tokens/place-finder.token.ts` | (angular), `@domain/lead/services/place-finder.service` (type-only) |
| `application/lead/tokens/contact-dispatcher.token.ts` | (angular), `@domain/lead/services/contact-dispatcher.service` (type-only) |
| `application/lead/tokens/message-template.token.ts` | (angular), `@domain/lead/services/message-template.service` (type-only) |
| `application/lead/index.ts` | barril: reexporta tokens, use cases, DTOs, mapper |

### 3.3 Infrastructure

| Arquivo | Importa de |
|---|---|
| `infrastructure/config/environment.config.ts` | `src/environments/environment` |
| `infrastructure/supabase/types/database.types.ts` | (gerado pelo Supabase CLI, zero imports) |
| `infrastructure/supabase/client/supabase.client.ts` | (angular: `Injectable`, `inject`), (supabase-js: `createClient`, `SupabaseClient`), `../types/database.types`, `../../config/environment.config` |
| `infrastructure/supabase/mappers/lead.mapper.ts` | `@domain/lead/entities/lead.entity`, todas as VOs do Lead, `../types/database.types` |
| `infrastructure/supabase/repositories/lead.supabase-repository.ts` | (angular: `Injectable`, `inject`), `@domain/lead/repositories/lead.repository` (type-only), `@domain/lead/entities/lead.entity`, VOs relevantes, `@domain/lead/errors/{lead-not-found,duplicate-lead}.error`, `../client/supabase.client`, `../mappers/lead.mapper`, `../types/database.types` |
| `infrastructure/google-places/place-finder.response.dto.ts` | (stdlib) |
| `infrastructure/google-places/place-finder.mapper.ts` | `@domain/lead/services/place-finder.service` (type-only — `PlaceFinderResult`), `./place-finder.response.dto` |
| `infrastructure/google-places/place-finder.http-service.ts` | (angular: `Injectable`, `inject`, `HttpClient`), (rxjs: `firstValueFrom`), `@domain/lead/services/place-finder.service` (type-only), `@domain/lead/errors/place-finder-unavailable.error`, `../supabase/client/supabase.client`, `./place-finder.response.dto`, `./place-finder.mapper` |
| `infrastructure/messaging/whatsapp.dispatcher.ts` | (stdlib — só `window.open`) |
| `infrastructure/messaging/email.dispatcher.ts` | (stdlib) |
| `infrastructure/messaging/contact-dispatcher.composite.ts` | (angular: `Injectable`), `@domain/lead/services/contact-dispatcher.service` (type-only), `@domain/lead/errors/dispatch-failed.error`, `./whatsapp.dispatcher`, `./email.dispatcher` |
| `infrastructure/templates/message-template.in-memory-service.ts` | (angular: `Injectable`), `@domain/lead/services/message-template.service` (type-only) |
| `infrastructure/providers/infrastructure.providers.ts` | (angular: `EnvironmentProviders`, `makeEnvironmentProviders`), `@application/lead/tokens/*` (todos os 4 tokens), `../supabase/repositories/lead.supabase-repository`, `../google-places/place-finder.http-service`, `../messaging/contact-dispatcher.composite`, `../templates/message-template.in-memory-service` |
| `infrastructure/index.ts` | barril: reexporta `infrastructure.providers` (única superfície pública necessária) |
| `supabase/functions/places-search/index.ts` | (deno: `serve` da Supabase Edge Runtime), Google Places HTTP API. **Isolado do código Angular — nada importa daqui.** |

### 3.4 Presentation

| Arquivo | Importa de |
|---|---|
| `presentation/shared/components/button/button.component.ts` | (angular), SCSS local |
| `presentation/shared/components/input/input.component.ts` | (angular: `Component`, `signal`, `input`, `output`, `model`), SCSS local |
| `presentation/shared/components/select/select.component.ts` | (angular), SCSS local |
| `presentation/shared/components/badge/badge.component.ts` | (angular), SCSS local |
| `presentation/shared/components/card/card.component.ts` | (angular), SCSS local |
| `presentation/shared/components/empty-state/empty-state.component.ts` | (angular), SCSS local |
| `presentation/shared/components/spinner/spinner.component.ts` | (angular), SCSS local |
| `presentation/shared/pipes/phone-format.pipe.ts` | (angular: `Pipe`, `PipeTransform`) |
| `presentation/layout/header/header.component.ts` | (angular), SCSS local |
| `presentation/layout/nav/nav.component.ts` | (angular: `Component`, `RouterLink`, `RouterLinkActive`), SCSS local |
| `presentation/features/search/store/search.store.ts` | (angular: `inject`), (ngrx-signals: `signalStore`, `withState`, `withMethods`, `withComputed`, `patchState`), `@application/lead/use-cases/search-leads/search-leads.use-case`, `@application/lead/dtos/lead.dto`, `@domain/lead/errors/*` |
| `presentation/features/search/components/search-form/search-form.component.ts` | (angular), `@domain/lead/value-objects/sector.vo` (type-only — para listar `Sector.ALL`), shared components |
| `presentation/features/search/components/search-result-card/search-result-card.component.ts` | (angular), `@application/lead/dtos/lead.dto` (type-only), shared components |
| `presentation/features/search/pages/search.page.ts` | (angular), `../store/search.store`, child components, shared components |
| `presentation/features/search/search.routes.ts` | (angular: `Routes`) |
| `presentation/features/pipeline/store/pipeline.store.ts` | (angular), (ngrx-signals), `@application/lead/use-cases/{update-lead-status,delete-lead,send-whatsapp,send-email}/*.use-case`, `@application/lead/dtos/lead.dto`, errors |
| `presentation/features/pipeline/components/pipeline-column/pipeline-column.component.ts` | (angular), `@application/lead/dtos/lead.dto` (type-only) |
| `presentation/features/pipeline/components/lead-card/lead-card.component.ts` | (angular), `@application/lead/dtos/lead.dto` (type-only), `@domain/lead/value-objects/lead-status.vo` (type-only), shared components |
| `presentation/features/pipeline/pages/pipeline.page.ts` | (angular), `../store/pipeline.store`, child components |
| `presentation/features/pipeline/pipeline.routes.ts` | (angular) |
| `presentation/features/add-lead/store/add-lead.store.ts` | (angular), (ngrx-signals), `@application/lead/use-cases/create-lead/create-lead.use-case`, errors |
| `presentation/features/add-lead/components/add-lead-form/add-lead-form.component.ts` | (angular), `@domain/lead/value-objects/sector.vo` (type-only), shared components |
| `presentation/features/add-lead/pages/add-lead.page.ts` | (angular), `../store/add-lead.store`, child component |
| `presentation/features/add-lead/add-lead.routes.ts` | (angular) |
| `src/app/app.component.ts` | (angular: `Component`, `RouterOutlet`), `presentation/layout/header/header.component`, `presentation/layout/nav/nav.component` |
| `src/app/app.config.ts` | (angular: `ApplicationConfig`, `provideRouter`, `provideHttpClient`, `provideZoneChangeDetection`), `./app.routes`, `@infrastructure/providers/infrastructure.providers` |
| `src/app/app.routes.ts` | (angular: `Routes`), referências lazy aos `.routes.ts` de cada feature |
| `src/main.ts` | (angular: `bootstrapApplication`), `./app/app.component`, `./app/app.config` |

### 3.5 Regras invariantes (ESLint policia via `eslint-plugin-boundaries`)

| Camada | NÃO pode importar de |
|---|---|
| `domain/**` | `application/**`, `infrastructure/**`, `presentation/**`, `@angular/*`, `@supabase/*`, `rxjs`, `@ngrx/*` |
| `application/**` | `infrastructure/**`, `presentation/**`, `@supabase/*`. Aceita apenas `@angular/core` (exclusivo para `InjectionToken` em `tokens/`). |
| `infrastructure/**` | `presentation/**` |
| `presentation/**` | nenhuma restrição entre camadas internas, mas **não pode importar diretamente de `infrastructure/**`** — só via tokens da Application. |
| `supabase/functions/**` | `src/**` (Edge Functions rodam em Deno isolado) |

A regra mais sutil é a última de Presentation: stores e componentes injetam tokens (`LEAD_REPOSITORY`, etc.), nunca classes concretas (`LeadSupabaseRepository`). Isso preserva a substituibilidade.

---

## 4. Schema Supabase

### 4.1 Decisões de modelagem

**ID como UUID v4, gerado no client.** `LeadId.generate()` cria UUID no browser via `crypto.randomUUID()`. Postgres recebe pronto, não usa `gen_random_uuid()` no DEFAULT.

**Status como ENUM nativo do Postgres.** Mais barato e mais seguro que `text + CHECK constraint`. Migrations futuras pra adicionar status são `ALTER TYPE ... ADD VALUE`.

**Setor como `text + CHECK constraint`, não ENUM.** Setores mudam mais que status. `CHECK` é mais fácil de evoluir que `ENUM` (que não permite remover valores nem reordenar).

**Coluna `phone_digits` separada da `phone`.** O VO `PhoneNumber.getValue()` já retorna só dígitos. Não há `phone_formatted` no banco — formatação é responsabilidade da apresentação.

**Coluna `city_normalized` gerada.** `GENERATED ALWAYS AS (lower(trim(city))) STORED`. Sempre coerente com `city`, indexável, usada na constraint de duplicata.

**RLS habilitado com policy permissiva no MVP.** Sem auth no MVP, mas policy `mvp_open_access` libera CRUD via anon key. Quando ligar auth, é só DROP a policy e criar a real (owner-based).

**Sem soft delete, sem tabela de eventos, sem `address_normalized`.** YAGNI confirmado.

### 4.2 Migration SQL

```sql
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
```

### 4.3 Notas técnicas

**Por que `numeric(2,1)` em rating?** Google Places retorna ratings tipo `4.2`, `4.7`. `numeric(2,1)` cobre 0.0–9.9 com exatidão decimal — mais barato que `real` em precisão.

**Por que `timestamptz` em vez de `timestamp`?** Timezone-aware é o default certo. JSX usa ISO 8601 com offset. Postgres armazena UTC e converte na leitura.

**Por que GIN trigram em vez de `tsvector` full-text?** Trigram funciona com `ILIKE '%query%'` (busca por substring, idêntico ao `String.includes()` do JSX). `tsvector` exige `to_tsquery` com lexemas — comportamento diferente.

**Constraint `UNIQUE` parcial vs trigger BEFORE INSERT.** Unique parcial é declarativo, performático e bloqueia inserts duplicados no nível do banco. `LeadRepository.existsByPhoneAndCity()` ainda existe pra dar erro semântico antes de tentar inserir, mas o banco é a última linha de defesa caso uma race condition escape.

### 4.4 Tipos gerados pelo Supabase CLI

Após rodar a migration:

```bash
pnpm dlx supabase gen types typescript --local > src/app/infrastructure/supabase/types/database.types.ts
```

Esse arquivo é o único ponto onde o shape do banco aparece no código TypeScript. Os mappers em `infrastructure/supabase/mappers/lead.mapper.ts` consomem esses tipos e produzem `Lead` (domain entity). Domain e Application nunca veem `database.types.ts`.

---

## 5. Estrutura de Pastas

```
prospect-ai/
├── .vscode/
│   └── settings.json
├── public/
│   └── favicon.ico
├── supabase/
│   ├── migrations/
│   │   └── 20260518000000_init_leads.sql
│   ├── functions/
│   │   └── places-search/
│   │       ├── index.ts
│   │       └── deno.json
│   ├── seed.sql
│   └── config.toml
├── src/
│   ├── app/
│   │   │
│   │   ├── domain/
│   │   │   ├── shared/
│   │   │   │   ├── errors/
│   │   │   │   │   ├── domain-error.base.ts
│   │   │   │   │   └── domain-error.base.spec.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── domain-event.base.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   └── value-object.base.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── lead/
│   │   │       ├── entities/
│   │   │       │   ├── lead.entity.ts
│   │   │       │   └── lead.entity.spec.ts
│   │   │       ├── value-objects/
│   │   │       │   ├── lead-id.vo.ts
│   │   │       │   ├── lead-id.vo.spec.ts
│   │   │       │   ├── business-name.vo.ts
│   │   │       │   ├── business-name.vo.spec.ts
│   │   │       │   ├── sector.vo.ts
│   │   │       │   ├── sector.vo.spec.ts
│   │   │       │   ├── lead-status.vo.ts
│   │   │       │   ├── lead-status.vo.spec.ts
│   │   │       │   ├── phone-number.vo.ts
│   │   │       │   ├── phone-number.vo.spec.ts
│   │   │       │   ├── email.vo.ts
│   │   │       │   ├── email.vo.spec.ts
│   │   │       │   ├── location.vo.ts
│   │   │       │   ├── location.vo.spec.ts
│   │   │       │   ├── contact-info.vo.ts
│   │   │       │   └── contact-info.vo.spec.ts
│   │   │       ├── repositories/
│   │   │       │   └── lead.repository.ts
│   │   │       ├── services/
│   │   │       │   ├── place-finder.service.ts
│   │   │       │   ├── contact-dispatcher.service.ts
│   │   │       │   └── message-template.service.ts
│   │   │       ├── events/
│   │   │       │   ├── lead-created.event.ts
│   │   │       │   ├── lead-status-changed.event.ts
│   │   │       │   └── lead-contacted.event.ts
│   │   │       ├── errors/
│   │   │       │   ├── lead-not-found.error.ts
│   │   │       │   ├── duplicate-lead.error.ts
│   │   │       │   ├── invalid-status-transition.error.ts
│   │   │       │   ├── business-name-invalid.error.ts
│   │   │       │   ├── sector-invalid.error.ts
│   │   │       │   ├── lead-status-invalid.error.ts
│   │   │       │   ├── phone-number-invalid.error.ts
│   │   │       │   ├── email-invalid.error.ts
│   │   │       │   ├── location-invalid.error.ts
│   │   │       │   ├── lead-id-invalid.error.ts
│   │   │       │   ├── contact-info-empty.error.ts
│   │   │       │   ├── lead-rating-invalid.error.ts
│   │   │       │   ├── lead-notes-too-long.error.ts
│   │   │       │   ├── lead-missing-contact-channel.error.ts
│   │   │       │   ├── place-finder-unavailable.error.ts
│   │   │       │   └── dispatch-failed.error.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── application/
│   │   │   ├── shared/
│   │   │   │   ├── use-case.interface.ts
│   │   │   │   ├── result.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── lead/
│   │   │       ├── dtos/
│   │   │       │   ├── lead.dto.ts
│   │   │       │   ├── lead.mapper.ts
│   │   │       │   └── lead.mapper.spec.ts
│   │   │       ├── use-cases/
│   │   │       │   ├── search-leads/
│   │   │       │   │   ├── search-leads.input.dto.ts
│   │   │       │   │   ├── search-leads.output.dto.ts
│   │   │       │   │   ├── search-leads.use-case.ts
│   │   │       │   │   └── search-leads.use-case.spec.ts
│   │   │       │   ├── create-lead/
│   │   │       │   │   ├── create-lead.input.dto.ts
│   │   │       │   │   ├── create-lead.output.dto.ts
│   │   │       │   │   ├── create-lead.use-case.ts
│   │   │       │   │   └── create-lead.use-case.spec.ts
│   │   │       │   ├── update-lead-status/
│   │   │       │   │   ├── update-lead-status.input.dto.ts
│   │   │       │   │   ├── update-lead-status.output.dto.ts
│   │   │       │   │   ├── update-lead-status.use-case.ts
│   │   │       │   │   └── update-lead-status.use-case.spec.ts
│   │   │       │   ├── delete-lead/
│   │   │       │   │   ├── delete-lead.input.dto.ts
│   │   │       │   │   ├── delete-lead.output.dto.ts
│   │   │       │   │   ├── delete-lead.use-case.ts
│   │   │       │   │   └── delete-lead.use-case.spec.ts
│   │   │       │   ├── send-whatsapp/
│   │   │       │   │   ├── send-whatsapp.input.dto.ts
│   │   │       │   │   ├── send-whatsapp.output.dto.ts
│   │   │       │   │   ├── send-whatsapp.use-case.ts
│   │   │       │   │   └── send-whatsapp.use-case.spec.ts
│   │   │       │   └── send-email/
│   │   │       │       ├── send-email.input.dto.ts
│   │   │       │       ├── send-email.output.dto.ts
│   │   │       │       ├── send-email.use-case.ts
│   │   │       │       └── send-email.use-case.spec.ts
│   │   │       ├── tokens/
│   │   │       │   ├── lead-repository.token.ts
│   │   │       │   ├── place-finder.token.ts
│   │   │       │   ├── contact-dispatcher.token.ts
│   │   │       │   └── message-template.token.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── supabase/
│   │   │   │   ├── client/
│   │   │   │   │   └── supabase.client.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── lead.supabase-repository.ts
│   │   │   │   │   └── lead.supabase-repository.spec.ts
│   │   │   │   ├── mappers/
│   │   │   │   │   ├── lead.mapper.ts
│   │   │   │   │   └── lead.mapper.spec.ts
│   │   │   │   └── types/
│   │   │   │       └── database.types.ts
│   │   │   ├── google-places/
│   │   │   │   ├── place-finder.http-service.ts
│   │   │   │   ├── place-finder.http-service.spec.ts
│   │   │   │   ├── place-finder.response.dto.ts
│   │   │   │   └── place-finder.mapper.ts
│   │   │   ├── messaging/
│   │   │   │   ├── whatsapp.dispatcher.ts
│   │   │   │   ├── whatsapp.dispatcher.spec.ts
│   │   │   │   ├── email.dispatcher.ts
│   │   │   │   ├── email.dispatcher.spec.ts
│   │   │   │   └── contact-dispatcher.composite.ts
│   │   │   ├── templates/
│   │   │   │   ├── message-template.in-memory-service.ts
│   │   │   │   └── message-template.in-memory-service.spec.ts
│   │   │   ├── config/
│   │   │   │   └── environment.config.ts
│   │   │   ├── providers/
│   │   │   │   └── infrastructure.providers.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── presentation/
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   │   ├── button/
│   │   │   │   │   │   ├── button.component.ts
│   │   │   │   │   │   ├── button.component.scss
│   │   │   │   │   │   └── button.component.spec.ts
│   │   │   │   │   ├── input/
│   │   │   │   │   │   ├── input.component.ts
│   │   │   │   │   │   ├── input.component.scss
│   │   │   │   │   │   └── input.component.spec.ts
│   │   │   │   │   ├── select/
│   │   │   │   │   │   ├── select.component.ts
│   │   │   │   │   │   ├── select.component.scss
│   │   │   │   │   │   └── select.component.spec.ts
│   │   │   │   │   ├── badge/
│   │   │   │   │   │   ├── badge.component.ts
│   │   │   │   │   │   ├── badge.component.scss
│   │   │   │   │   │   └── badge.component.spec.ts
│   │   │   │   │   ├── card/
│   │   │   │   │   │   ├── card.component.ts
│   │   │   │   │   │   ├── card.component.scss
│   │   │   │   │   │   └── card.component.spec.ts
│   │   │   │   │   ├── empty-state/
│   │   │   │   │   │   ├── empty-state.component.ts
│   │   │   │   │   │   └── empty-state.component.scss
│   │   │   │   │   └── spinner/
│   │   │   │   │       ├── spinner.component.ts
│   │   │   │   │       └── spinner.component.scss
│   │   │   │   ├── pipes/
│   │   │   │   │   ├── phone-format.pipe.ts
│   │   │   │   │   └── phone-format.pipe.spec.ts
│   │   │   │   └── directives/
│   │   │   │       └── .gitkeep
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── header/
│   │   │   │   │   ├── header.component.ts
│   │   │   │   │   └── header.component.scss
│   │   │   │   └── nav/
│   │   │   │       ├── nav.component.ts
│   │   │   │       └── nav.component.scss
│   │   │   │
│   │   │   └── features/
│   │   │       ├── search/
│   │   │       │   ├── pages/
│   │   │       │   │   ├── search.page.ts
│   │   │       │   │   ├── search.page.scss
│   │   │       │   │   └── search.page.spec.ts
│   │   │       │   ├── components/
│   │   │       │   │   ├── search-form/
│   │   │       │   │   │   ├── search-form.component.ts
│   │   │       │   │   │   └── search-form.component.scss
│   │   │       │   │   └── search-result-card/
│   │   │       │   │       ├── search-result-card.component.ts
│   │   │       │   │       └── search-result-card.component.scss
│   │   │       │   ├── store/
│   │   │       │   │   ├── search.store.ts
│   │   │       │   │   └── search.store.spec.ts
│   │   │       │   └── search.routes.ts
│   │   │       │
│   │   │       ├── pipeline/
│   │   │       │   ├── pages/
│   │   │       │   │   ├── pipeline.page.ts
│   │   │       │   │   ├── pipeline.page.scss
│   │   │       │   │   └── pipeline.page.spec.ts
│   │   │       │   ├── components/
│   │   │       │   │   ├── pipeline-column/
│   │   │       │   │   │   ├── pipeline-column.component.ts
│   │   │       │   │   │   └── pipeline-column.component.scss
│   │   │       │   │   └── lead-card/
│   │   │       │   │       ├── lead-card.component.ts
│   │   │       │   │       └── lead-card.component.scss
│   │   │       │   ├── store/
│   │   │       │   │   ├── pipeline.store.ts
│   │   │       │   │   └── pipeline.store.spec.ts
│   │   │       │   └── pipeline.routes.ts
│   │   │       │
│   │   │       └── add-lead/
│   │   │           ├── pages/
│   │   │           │   ├── add-lead.page.ts
│   │   │           │   ├── add-lead.page.scss
│   │   │           │   └── add-lead.page.spec.ts
│   │   │           ├── components/
│   │   │           │   └── add-lead-form/
│   │   │           │       ├── add-lead-form.component.ts
│   │   │           │       └── add-lead-form.component.scss
│   │   │           ├── store/
│   │   │           │   ├── add-lead.store.ts
│   │   │           │   └── add-lead.store.spec.ts
│   │   │           └── add-lead.routes.ts
│   │   │
│   │   ├── app.component.ts
│   │   ├── app.component.scss
│   │   ├── app.component.spec.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   │
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.development.ts
│   │
│   ├── styles/
│   │   ├── _tokens.scss
│   │   ├── _reset.scss
│   │   ├── _mixins.scss
│   │   ├── _typography.scss
│   │   └── styles.scss
│   │
│   ├── index.html
│   └── main.ts
│
├── .editorconfig
├── .gitignore
├── .prettierrc
├── angular.json
├── eslint.config.js
├── jest.config.ts
├── jest.setup.ts
├── package.json
├── README.md
├── PROSPECT_AI_PLAN.md
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.spec.json
```

---

## 6. Estratégia de Testes

### 6.1 Filosofia e divisão de esforço

| Camada | % do esforço | Velocidade | Confiabilidade |
|---|---|---|---|
| Domain | ~50% | <50ms total | Altíssima (puro) |
| Application | ~30% | <200ms total | Alta (orquestração) |
| Infrastructure | ~15% | 2–5s (Supabase local) | Média (depende de infra) |
| Presentation | ~5% | <1s (TestBed shallow) | Baixa (UI muda) |

### 6.2 Tabela de ferramentas

| Camada | Ferramenta | O que testar | O que mockar |
|---|---|---|---|
| Domain | Jest puro | Construção de VOs, invariantes, transições, eventos, `isStale()`, hidratação | Nada (puro TS) |
| Application | Jest puro | Orquestração dos use cases, sequência de chamadas, erros propagados, mapper | `LeadRepository`, `PlaceFinderService`, `ContactDispatcherService`, `MessageTemplateService` (todos via `jest.fn()`) |
| Infrastructure | Jest + Supabase local | Queries reais, constraint de duplicata, índices, mappers ida-e-volta | Supabase em container local |
| Presentation | Angular TestBed + Jest | Componentes renderizam estado do store, eventos disparam métodos, pipes | Use cases (via `provide` com `jest.fn()`), stores em testes de componente |

### 6.3 Convenções

**Nomenclatura:** `it('should X when Y', ...)`. Verbo no início, condição no final.

**AAA explícito:** Arrange / Act / Assert separados por linha em branco dentro do `it`.

**Factories:** função `makeLead(overrides)` em `domain/lead/entities/__fixtures__/lead.fixture.ts`.

**Datas:** `jest.useFakeTimers()` com `new Date('2026-05-18T12:00:00Z')` em qualquer spec que envolva `now`.

**Scripts no `package.json`:**
```json
"test:domain": "jest --testPathPattern=domain",
"test:application": "jest --testPathPattern=application",
"test:infrastructure": "jest --testPathPattern=infrastructure --runInBand",
"test:presentation": "jest --testPathPattern=presentation"
```

### 6.4 Casos prioritários — Domain

**`lead-id.vo.spec.ts`**
- LeadId.generate: should produce a valid UUID v4
- LeadId.generate: should produce different ids on each call
- LeadId.fromString: should accept valid UUID v4 string
- LeadId.fromString: should throw LeadIdInvalidError when string is not UUID
- LeadId.equals: should return true for same value
- LeadId.equals: should return false for different values

**`business-name.vo.spec.ts`**
- should accept name between 2 and 120 chars after trim
- should throw with reason EMPTY when value is whitespace only
- should throw with reason TOO_SHORT when trimmed length is 1
- should throw with reason TOO_LONG when trimmed length is 121
- should preserve internal whitespace
- should trim leading and trailing whitespace

**`sector.vo.spec.ts`**
- should accept each of the 10 canonical sector values
- should throw SectorInvalidError for unknown sector
- should expose ALL as readonly array with 10 items
- equals should compare by value

**`lead-status.vo.spec.ts`** *(20 casos de transição obrigatórios)*
- factory `novo/contatado/proposta/fechado/descartado` should produce respective status
- create should throw for unknown status string
- **canTransitionTo: novo → contatado is allowed**
- **canTransitionTo: novo → descartado is allowed**
- **canTransitionTo: novo → proposta is FORBIDDEN**
- **canTransitionTo: novo → fechado is FORBIDDEN**
- **canTransitionTo: contatado → proposta is allowed**
- **canTransitionTo: contatado → novo is allowed (reabertura)**
- **canTransitionTo: contatado → descartado is allowed**
- **canTransitionTo: contatado → fechado is FORBIDDEN**
- **canTransitionTo: proposta → fechado is allowed**
- **canTransitionTo: proposta → contatado is allowed (recuo)**
- **canTransitionTo: proposta → descartado is allowed**
- **canTransitionTo: proposta → novo is FORBIDDEN**
- **canTransitionTo: fechado → proposta is allowed (reabertura)**
- **canTransitionTo: fechado → novo is FORBIDDEN**
- **canTransitionTo: fechado → contatado is FORBIDDEN**
- **canTransitionTo: fechado → descartado is FORBIDDEN**
- **canTransitionTo: descartado → novo is allowed (reativação)**
- **canTransitionTo: descartado → contatado is FORBIDDEN**
- canTransitionTo: same status should return false

**`phone-number.vo.spec.ts`**
- should normalize "(21) 99999-0001" to "21999990001"
- should normalize "+55 21 99999-0001" stripping DDI
- should accept 10 digits (DDD + 8 digits — fixo BR)
- should accept 11 digits (DDD + 9 digits — celular BR)
- should throw EMPTY for empty string
- should throw EMPTY for whitespace only
- should throw WRONG_LENGTH for 9 digits
- should throw WRONG_LENGTH for 12 digits (after stripping DDI 55)
- should throw NON_NUMERIC for "abc"
- getFormatted should produce "(21) 99999-0001" for 11 digits
- getFormatted should produce "(21) 9999-0001" for 10 digits
- toWhatsAppDigits should prepend 55
- toWhatsAppDigits should not double-prepend if input already had 55

**`email.vo.spec.ts`**
- should accept "user@domain.com"
- should normalize to lowercase
- should trim whitespace
- should throw for "no-at-sign"
- should throw for "@no-local.com"
- should throw for "no-domain@"
- should throw for empty string

**`location.vo.spec.ts`**
- should accept city alone (address optional)
- should accept city and address together
- should throw LocationInvalidError on CITY when city is empty
- should throw LocationInvalidError on CITY when city is 1 char
- should throw LocationInvalidError on ADDRESS when address > 200 chars
- getCityNormalized should return lowercase trimmed
- getCityNormalized of "Niterói" equals getCityNormalized of "  NITERÓI  "

**`contact-info.vo.spec.ts`**
- should accept phone only
- should accept email only
- should accept both phone and email
- **should throw ContactInfoEmptyError when both are null**
- hasPhone should return true when phone present
- hasEmail should return true when email present

**`lead.entity.spec.ts`** *(o spec mais importante)*
- create: should produce Lead with status='novo' by default
- create: should set hasWebsite=false by default
- create: should accept rating between 0 and 5 (inclusive nas bordas)
- create: should throw LeadRatingInvalidError for rating < 0
- create: should throw LeadRatingInvalidError for rating > 5
- create: should emit LeadCreatedEvent on creation
- create: should set createdAt to current time
- reconstitute: should NOT emit LeadCreatedEvent (hydration only)
- changeStatus: should change status when transition is valid
- changeStatus: should throw InvalidStatusTransitionError for invalid transition
- changeStatus: should emit LeadStatusChangedEvent with from and to
- registerContact: should increment contactCount by 1
- registerContact: should set lastContactAt to provided date
- **registerContact: should auto-transition novo → contatado on whatsapp**
- **registerContact: should auto-transition novo → contatado on email**
- registerContact: should NOT transition when status is contatado
- registerContact: should NOT transition when status is proposta
- registerContact: should emit LeadContactedEvent
- registerContact: should emit BOTH LeadContactedEvent AND LeadStatusChangedEvent when auto-transitioning
- **registerContact: should throw LeadMissingContactChannelError when channel=whatsapp and no phone**
- **registerContact: should throw LeadMissingContactChannelError when channel=email and no email**
- updateNotes: should accept empty string (clear notes)
- updateNotes: should accept 2000 chars
- updateNotes: should throw LeadNotesTooLongError at 2001 chars
- isStale: should return false when status is not contatado
- isStale: should return false when lastContactAt is null
- isStale: should return true when status=contatado and ≥ threshold days passed
- isStale: should return false when exactly threshold-1 days passed
- pullEvents: should return accumulated events
- pullEvents: should clear internal buffer after call
- pullEvents: should return empty array when no events

### 6.5 Casos prioritários — Application

**`search-leads.use-case.spec.ts`**
- should call placeFinder.search with sector and city from input
- should throw SectorInvalidError when input.sector is not canonical
- should propagate PlaceFinderUnavailableError from placeFinder
- **should skip places with hasWebsite=true and return itemStatus='skipped_has_website'**
- **should skip places that match existsByPhoneAndCity and return itemStatus='skipped_duplicate'**
- should skip places with invalid phone and return itemStatus='skipped_invalid' with reason
- should call leadRepository.save once per added lead
- should return correct counters in output (addedCount, skippedDuplicates, etc.)
- should return empty items array when placeFinder returns empty
- should return totalFound matching placeFinder length regardless of skips

**`create-lead.use-case.spec.ts`**
- should call repository.save when input is valid
- should throw BusinessNameInvalidError for empty name
- should throw SectorInvalidError for unknown sector
- should throw ContactInfoEmptyError when neither phone nor email provided
- should throw PhoneNumberInvalidError for malformed phone
- should throw EmailInvalidError for malformed email
- **should throw DuplicateLeadError when existsByPhoneAndCity returns true**
- should NOT call existsByPhoneAndCity when phone is null
- should return LeadDto with id, businessName, etc.

**`update-lead-status.use-case.spec.ts`**
- should throw LeadIdInvalidError when leadId is not UUID
- should throw LeadNotFoundError when repository returns null
- should throw LeadStatusInvalidError for unknown status string
- should throw InvalidStatusTransitionError for forbidden transition
- should call repository.save with updated lead on success
- should return updated LeadDto with new status

**`delete-lead.use-case.spec.ts`**
- should call repository.delete with the LeadId
- should throw LeadNotFoundError when repository.delete throws
- should return leadId and deletedAtIso

**`send-whatsapp.use-case.spec.ts`**
- should throw LeadNotFoundError when lead does not exist
- **should throw LeadMissingContactChannelError when lead has no phone**
- should call messageTemplateService.getTemplate with 'whatsapp'
- should call messageTemplateService.render with lead's name, sector, city
- should call contactDispatcher.dispatchWhatsApp with formatted digits and rendered message
- **should call lead.registerContact('whatsapp', now)**
- should save lead after registering contact
- should return dispatchedUrl from dispatcher result

**`send-email.use-case.spec.ts`** — espelho do send-whatsapp com canal email.

**`lead.mapper.spec.ts`**
- should map Lead entity to LeadDto with all fields
- should map phone via getValue (digits)
- should map phoneFormatted via getFormatted
- should map null phone to null in DTO
- should map createdAt Date to ISO string
- should map null lastContactAt to null in DTO

### 6.6 Casos prioritários — Infrastructure

**`lead.supabase-repository.spec.ts`** *(roda contra Supabase local)*

Setup: `beforeEach` faz `TRUNCATE leads`. `afterAll` para o cliente.

- save: should insert new lead
- save: should update existing lead (upsert)
- save: should persist all fields including notes, rating, contactCount
- findById: should return Lead when exists
- findById: should return null when not exists
- findAll: should return all leads when no filter
- findAll: should filter by status
- findAll: should filter by sector
- findAll: should filter by textQuery matching businessName
- findAll: should filter by textQuery matching city
- findAll: should filter by textQuery matching sector
- findAll: should sort by createdAt DESC by default
- findAll: should sort by rating with NULLS LAST
- findAll: should sort by lastContactAt with NULLS LAST
- findAll: should respect limit and offset
- **existsByPhoneAndCity: should return true for normalized phone match in same city**
- **existsByPhoneAndCity: should return true regardless of city case**
- existsByPhoneAndCity: should return false when phone matches but city differs
- delete: should remove lead from database
- delete: should throw LeadNotFoundError when lead does not exist
- count: should return correct count for filter
- statsByStatus: should return counts grouped by status

**`lead.mapper.spec.ts` (infrastructure)**
- toDomain: should hydrate Lead from supabase row
- toDomain: should map phone_digits via PhoneNumber.create
- toDomain: should handle null phone_digits as null ContactInfo phone
- toRow: should produce row matching supabase types
- toRow: should produce only digits in phone_digits column
- roundtrip: toDomain(toRow(lead)) should equal lead

**`place-finder.http-service.spec.ts`**
- should POST to Edge Function URL with sector and city
- should map Edge Function response via mapper
- should throw PlaceFinderUnavailableError on HTTP 5xx
- should throw PlaceFinderUnavailableError on network error
- should return empty array when Edge Function returns empty results

**`whatsapp.dispatcher.spec.ts`**
- should produce wa.me URL with phone and encoded message
- should URL-encode special chars in message (acentos, emoji)
- should call window.open with _blank
- should throw DispatchFailedError when window.open returns null

**`email.dispatcher.spec.ts`**
- should produce mailto: URL with to, subject, body
- should URL-encode special chars in subject and body
- should handle null subject (omit from URL)

**`message-template.in-memory-service.spec.ts`**
- getTemplate('whatsapp') should return WhatsApp default template
- getTemplate('email') should return Email default template with subject
- render should substitute {{nome}} occurrences
- render should substitute {{setor}} occurrences
- render should substitute {{cidade}} occurrences
- render should leave unknown placeholders literal
- render should substitute same placeholder multiple times

### 6.7 Casos prioritários — Presentation

**`search.store.spec.ts`**
- should start with empty results and loading=false
- should set loading=true when search starts
- should populate results when search completes
- should set error when use case throws
- should clear error on new search

**`pipeline.store.spec.ts`**
- should load leads on init via loadLeads()
- should update lead in state after updateStatus succeeds
- should remove lead from state after delete succeeds
- should show error toast when updateStatus throws InvalidStatusTransitionError

**`add-lead.store.spec.ts`**
- should add lead to pipeline state after create succeeds
- should show duplicate error when DuplicateLeadError thrown

**`lead-card.component.spec.ts`**
- should render lead businessName
- should render status badge with correct label
- should emit statusChange event when transition button clicked
- should disable forbidden transition buttons
- should show stale indicator when lead.isStale visual marker is on

**`phone-format.pipe.spec.ts`**
- should format 11-digit phone as "(21) 99999-0001"
- should format 10-digit phone as "(21) 9999-0001"
- should return empty string for null

Demais componentes recebem **spec smoke** (compila e renderiza sem erro).

---

## 7. Riscos Técnicos

### 7.1 Riscos de Alta Prioridade

```
RISCO: API key vazada em build do client
Descrição: Se a Google Places API key for embedada no bundle do Angular
  (mesmo via environment.ts), ela aparece no JS público da Vercel. Qualquer
  pessoa abre devtools, encontra a key, e usa em outros projetos consumindo
  sua quota Google Cloud (potencial cobrança $$$).
Camada afetada: infrastructure + supabase/functions
Mitigação: A key VIVE EXCLUSIVAMENTE na Edge Function `places-search`, como
  variável de ambiente do Supabase (`supabase secrets set GOOGLE_PLACES_API_KEY=...`).
  O frontend chama a Edge Function (que tem CORS e rate limit), não a Google.
  Restringir a key no Google Cloud Console por: (1) HTTP referrer da Edge Function,
  (2) Places API apenas, (3) quota diária baixa (1000 req/dia inicial).
  Nunca commitar a key. `.env` no .gitignore. `supabase/.env.local` no .gitignore.
Prioridade: alta
```

```
RISCO: Anon key do Supabase vazada
Descrição: A anon key vai pro client em build-time. Não é segredo absoluto
  (Supabase trata como semi-pública), mas combinada com RLS permissiva
  `mvp_open_access`, qualquer pessoa com a key tem CRUD completo em `leads`.
Camada afetada: infrastructure + supabase
Mitigação: (1) Vercel deploy privado (não público) durante o MVP single-user.
  (2) Quando entrar auth real (v1.1), trocar policy permissiva por owner-based
  IMEDIATAMENTE, antes de divulgar o app. (3) Rate limit a nível Supabase
  configurado pra abortar floods. (4) Monitorar Supabase logs por padrões
  anômalos (insert burst sem login).
Prioridade: alta
```

```
RISCO: Constraint UNIQUE de duplicata escapa em race condition
Descrição: Dois SearchLeads concorrentes podem ambos chamar
  existsByPhoneAndCity, ambos receberem false, e ambos inserirem o mesmo
  phone/city — violando a regra de negócio. Sem o unique index parcial,
  o banco aceitaria silenciosamente.
Camada afetada: infrastructure (Supabase) + application
Mitigação: Unique index parcial `leads_phone_city_unique` já no schema é a
  defesa final. No use case, capturar erro de constraint do Supabase (código
  PostgreSQL `23505`) e converter em DuplicateLeadError. NUNCA confiar
  apenas no existsByPhoneAndCity — ele é otimização (evita save desnecessário),
  o banco é a fonte de verdade.
Prioridade: alta
```

```
RISCO: Web Crypto API não disponível em ambientes antigos
Descrição: LeadId.generate() usa globalThis.crypto.randomUUID(). Em Node <19
  ou navegadores muito antigos (IE, Safari pré-15.4), falha silenciosa.
Camada afetada: domain (LeadId)
Mitigação: (1) Verificar disponibilidade no momento da inicialização do app
  e logar warning explícito se ausente. (2) tsconfig com `lib: ["ES2022", "DOM"]`
  garante os types. (3) Documentar requisito mínimo de browser no README
  (Chrome 92+, Firefox 95+, Safari 15.4+). (4) Para testes Jest, garantir
  `testEnvironment: 'jsdom'` ou polyfill via setup file.
Prioridade: alta
```

```
RISCO: Caracteres especiais quebram wa.me ou mailto: URLs
Descrição: Templates contêm acentos ("Olá", "negócio") e podem conter emoji.
  Sem encoding correto, o link wa.me abre mensagem truncada ou vazia.
  encodeURIComponent é necessário mas insuficiente: alguns clientes de email
  não aceitam mailto: com body > 2000 chars; WhatsApp Web tem limite informal
  de ~4000 chars no parâmetro `text`.
Camada afetada: infrastructure (whatsapp.dispatcher, email.dispatcher)
Mitigação: (1) Sempre encodeURIComponent no subject E no body. (2) Testar
  com strings difíceis nos specs (acentos, emojis, quebras de linha,
  caracteres &, =, ?, #). (3) Truncar body em 1800 chars no email com
  reticências, body em 3500 chars no WhatsApp. (4) Logar URL gerada (sem
  vazar phone no log) pra debug.
Prioridade: alta
```

```
RISCO: Signal Store dessincroniza do Supabase
Descrição: Operação de updateStatus chama o use case, recebe LeadDto atualizado,
  mas o store esquece de atualizar o item correspondente — UI mostra stale data
  até refresh. Pior: store atualiza otimistamente, mas a chamada ao banco falha
  silenciosamente — UI mente.
Camada afetada: presentation (stores)
Mitigação: Padrão "pessimist with rollback":
  1. Store entra em loading
  2. Chama use case (await)
  3. SE sucesso: substitui item no estado pelo DTO retornado
  4. SE erro: NÃO altera estado, propaga erro pra UI via signal de erro
  Nunca confiar em "patch local + assume sucesso". Toda mutação RETORNA o
  estado canônico do servidor.
Prioridade: alta
```

```
RISCO: ESLint não bloqueia imports cross-layer
Descrição: Sem regra rigorosa, é trivial alguém importar Supabase no domain
  e a arquitetura inteira degrada em meses. Importação acidental de
  @angular/core no domain quebra portabilidade futura.
Camada afetada: tooling (eslint.config.js)
Mitigação: Configurar eslint-plugin-boundaries com elements/rules explícitas
  conforme tabela 3.5. CI bloqueia merge se regra violada.
Prioridade: alta
```

### 7.2 Riscos de Prioridade Média

```
RISCO: Edge Function retorna shape diferente do esperado
Descrição: A Edge Function `places-search` é código separado, possivelmente
  com sua própria evolução. Se ela retornar campo `website_url` mas o mapper
  espera `hasWebsite`, o filtro de website não funciona — leads com site
  entram no pipeline.
Camada afetada: supabase/functions + infrastructure/google-places
Mitigação: (1) Definir contrato explícito em
  `infrastructure/google-places/place-finder.response.dto.ts`. (2) Spec do
  mapper testa todas as variantes de payload (com/sem website, rating null,
  address null). (3) Edge Function valida shape antes de retornar.
Prioridade: média
```

```
RISCO: Notes overflow não tem aviso de UX
Descrição: Domain rejeita notes > 2000 chars com LeadNotesTooLongError.
  Se a UI permitir digitar 2500 chars no textarea, o save falha sem
  feedback claro pro usuário.
Camada afetada: presentation
Mitigação: Atributo `maxlength="2000"` no <textarea> + contador visível
  ("1850/2000 chars"). NUNCA confiar em "o usuário não digita tanto".
Prioridade: média
```

```
RISCO: Rating do Google Places vem como número, mas pode chegar null/undefined
Descrição: Lugares novos sem reviews vêm sem rating. Se mapper assumir
  Number(response.rating), vira NaN, que viola constraint do schema (0-5).
Camada afetada: infrastructure (place-finder.mapper)
Mitigação: Mapper trata explicitamente null/undefined → null no domain.
  Spec do mapper cobre o caso. Schema permite rating NULL.
Prioridade: média
```

```
RISCO: Limites de quota da Google Places API
Descrição: Sem cap explícito, uma busca infinita ou bug em loop pode
  consumir o crédito gratuito ($200/mês), gerando cobrança.
Camada afetada: supabase/functions + Google Cloud Console
Mitigação: (1) No Google Cloud Console, configurar quota diária de 100 reqs/dia
  inicialmente. (2) Edge Function tem timeout (Supabase: 60s). (3) UI tem
  debounce de 800ms no input de cidade para evitar floods acidentais.
  (4) Cache no client: mesma (sector, city) em <5min retorna do cache.
Prioridade: média
```

### 7.3 Riscos de Prioridade Baixa

```
RISCO: Phone normalization perde DDI legítimo de outros países
Descrição: PhoneNumber.create aceita 10-11 dígitos BR. Se algum dia chegar
  lead internacional, o VO rejeita.
Camada afetada: domain (PhoneNumber)
Mitigação: Documentar premissa "MVP é BR only" no JSDoc do PhoneNumber.
  Quando internacionalizar (v2+), criar PhoneNumberInternational separado
  ou migrar pra libphonenumber-js. NÃO over-engineer agora.
Prioridade: baixa
```

```
RISCO: Templates editáveis na UI esperados pelos usuários
Descrição: O JSX permite editar templates em runtime. Decisão do MVP foi
  pular essa feature (templates hardcoded). Você pode sentir falta
  rapidamente em uso real.
Camada afetada: application + infrastructure + presentation
Mitigação: Schema de migration `messages_templates` pronto pra rodar em
  v1.1. Quando precisar, o trabalho é ~2 dias.
Prioridade: baixa
```

```
RISCO: Stale lead threshold hardcoded em 3 dias
Descrição: JSX usa 3 dias fixo. Domain recebe threshold por parâmetro
  (correto), mas a UI hardcoda 3. Se você quiser experimentar com 5 ou 7,
  é mudança de UI.
Camada afetada: presentation
Mitigação: Constante exportada em `presentation/shared/constants.ts`:
  `export const STALE_THRESHOLD_DAYS = 3;`. Configurável depois via store
  de preferências (futuro).
Prioridade: baixa
```

```
RISCO: Falta de migration de rollback
Descrição: Migration cria estrutura, mas não há reverse. Se algo der errado,
  é DROP TABLE manual.
Camada afetada: supabase (migrations)
Mitigação: Supabase CLI gera DOWN migrations quando configurado. Manter
  snapshot do estado pré-migration em ambiente de staging antes de aplicar
  em produção.
Prioridade: baixa
```

---

## 8. Checklist de Execução para o Codex

Princípios:
- **Cada item = 1 prompt no Claude Code = 1 PR pequeno** (~30-150 linhas)
- **Cada item entrega artefato testável** (build verde, specs passando ou skipados)
- **Sem decisões pendentes dentro do item** — tudo já está em Seções 1–7

Estimativa total: 95 itens. Executável em 4-6 dias de trabalho focado.

### Fase 0 — Setup e Tooling

```
[x] 1. Inicializar projeto Angular 17+ standalone com `pnpm dlx @angular/cli new prospect-ai --standalone --routing --style=scss --skip-tests --package-manager=pnpm`. Confirmar que `package.json` usa pnpm e que `src/app/app.component.ts` é standalone.

[x] 2. Configurar `tsconfig.json` com `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`. Adicionar `paths` aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`.

[x] 3. Instalar e configurar Jest no projeto Angular: `pnpm add -D jest @types/jest jest-preset-angular @angular-builders/jest`. Criar `jest.config.ts` na raiz com presets para Angular. Criar `jest.setup.ts` com `import 'jest-preset-angular/setup-jest'`.

[x] 4. Configurar scripts no `package.json`: `test`, `test:domain`, `test:application`, `test:infrastructure --runInBand`, `test:presentation`, `lint`, `build`.

[x] 5. Criar `eslint.config.js` com flat config (Angular 17+). Instalar `eslint-plugin-boundaries`. Configurar regra `boundaries/element-types` com 4 elements: domain, application, infrastructure, presentation. Aplicar as restrições da tabela 3.5 do plano.

[x] 6. Criar `.editorconfig` com `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`. Criar `.prettierrc` com `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`.

[x] 7. Inicializar Supabase localmente: `pnpm dlx supabase init`. Configurar `supabase/config.toml` para projeto local. Confirmar que `supabase start` sobe os containers.
```

### Fase 1 — Schema do Banco

```
[x] 8. Criar migration `supabase/migrations/20260518000000_init_leads.sql` com o SQL completo da Seção 4.2 do plano (tabela leads + tipo lead_status + constraints + índices + trigger updated_at + RLS habilitado + policy mvp_open_access + grants).

[x] 9. Rodar `supabase db reset` localmente e confirmar que migration aplica sem erro. Validar via psql que: (a) tabela leads existe, (b) tipo lead_status tem 5 valores, (c) unique index parcial leads_phone_city_unique existe, (d) trigger touch_updated_at está ativo.

[x] 10. Gerar tipos TypeScript do Supabase: `pnpm dlx supabase gen types typescript --local > src/app/infrastructure/supabase/types/database.types.ts`. Confirmar que o arquivo tem o tipo `Database` exportado.
```

### Fase 2 — Domain Shared

```
[x] 11. Criar `src/app/domain/shared/errors/domain-error.base.ts` com classe abstrata DomainError conforme Seção 2.1.1. Adicionar spec `domain-error.base.spec.ts` testando que a classe herda corretamente o name e mantém o prototype chain.

[x] 12. Criar `src/app/domain/shared/events/domain-event.base.ts` com classe abstrata DomainEvent conforme Seção 2.1.1.

[x] 13. Criar `src/app/domain/shared/index.ts` reexportando domain-error.base e domain-event.base.
```

### Fase 3 — Domain Errors do Lead

```
[x] 14. Criar todos os 16 arquivos de erro em `src/app/domain/lead/errors/` (lead-id-invalid, business-name-invalid, sector-invalid, lead-status-invalid, phone-number-invalid, email-invalid, location-invalid, contact-info-empty, lead-rating-invalid, lead-notes-too-long, invalid-status-transition, lead-not-found, duplicate-lead, lead-missing-contact-channel, place-finder-unavailable, dispatch-failed). Cada um conforme Seção 2.5. SEM specs por enquanto — são DTOs de erro, testados indiretamente nas VOs.
```

### Fase 4 — Value Objects (1 item por VO, com spec)

```
[x] 15. Criar `src/app/domain/lead/value-objects/lead-id.vo.ts` conforme Seção 2.1.2. Usar globalThis.crypto.randomUUID() em generate(). Validar UUID v4 regex em fromString. + spec completo com casos da Seção 6.4.

[x] 16. Criar `src/app/domain/lead/value-objects/business-name.vo.ts` (2-120 chars após trim). + spec completo.

[x] 17. Criar `src/app/domain/lead/value-objects/sector.vo.ts` com union literal de 10 valores e static ALL readonly. + spec completo.

[x] 18. Criar `src/app/domain/lead/value-objects/lead-status.vo.ts` com 5 status + factories estáticas + canTransitionTo() implementando a tabela VALID_TRANSITIONS do JSX. + spec com os 20 casos de transição da Seção 6.4.

[x] 19. Criar `src/app/domain/lead/value-objects/phone-number.vo.ts` com normalização BR (10 ou 11 dígitos, com/sem DDI 55) e métodos getValue/getFormatted/toWhatsAppDigits. + spec completo.

[x] 20. Criar `src/app/domain/lead/value-objects/email.vo.ts` com regex RFC simplificado e lowercase normalizado. + spec.

[x] 21. Criar `src/app/domain/lead/value-objects/location.vo.ts` com city obrigatório e address opcional, expondo getCityNormalized(). + spec.

[x] 22. Criar `src/app/domain/lead/value-objects/contact-info.vo.ts` exigindo phone XOR email não-null. + spec.
```

### Fase 5 — Domain Events do Lead

```
[x] 23. Criar 3 arquivos de eventos: lead-created.event.ts, lead-status-changed.event.ts, lead-contacted.event.ts conforme Seção 2.1.4. + 1 spec mínimo por arquivo (instanciar e verificar payload).
```

### Fase 6 — Entity Lead (peça mais densa)

```
[x] 24. Criar `src/app/domain/lead/entities/lead.entity.ts` com construtor privado, factories estáticas create() e reconstitute(), todos os getters readonly, e métodos changeStatus, registerContact, updateNotes, isStale, pullEvents. Conforme Seção 2.1.3, incluindo validação de canal em registerContact e auto-transição novo→contatado. + spec completo com TODOS os casos da Seção 6.4 (~32 casos).
```

### Fase 7 — Interfaces de Repository e Services

```
[x] 25. Criar `src/app/domain/lead/repositories/lead.repository.ts` com interface LeadRepository + LeadFilter + LeadStatsByStatus conforme Seção 2.2. ZERO implementação — só interfaces.

[x] 26. Criar `src/app/domain/lead/services/place-finder.service.ts` com interface PlaceFinderService + tipos auxiliares conforme Seção 2.3.

[x] 27. Criar `src/app/domain/lead/services/contact-dispatcher.service.ts` com interface ContactDispatcherService (com DispatchResult retornando URL) conforme Seção 2.3.

[x] 28. Criar `src/app/domain/lead/services/message-template.service.ts` com interface MessageTemplateService + tipos conforme Seção 2.3.

[x] 29. Criar `src/app/domain/lead/index.ts` reexportando entity, todas as VOs, todos os events, todas as interfaces de repo/services, e todos os errors.
```

### Fase 8 — Application Shared

```
[x] 30. Criar `src/app/application/shared/use-case.interface.ts` com interface UseCase<TInput, TOutput>. Sem spec (interface pura).

[x] 31. Criar `src/app/application/shared/result.ts` com tipo Result e helpers Result.ok() e Result.err() conforme Seção 2.4.0. + spec testando os helpers.

[x] 32. Criar `src/app/application/shared/index.ts` reexportando use-case.interface e result.
```

### Fase 9 — Lead DTO e Mapper

```
[x] 33. Criar `src/app/application/lead/dtos/lead.dto.ts` com interface LeadDto conforme Seção 2.4.1.

[x] 34. Criar `src/app/application/lead/dtos/lead.mapper.ts` com classe LeadMapper e método estático toDto(lead: Lead): LeadDto. + spec completo da Seção 6.5.
```

### Fase 10 — Tokens de Injeção

```
[x] 35. Criar os 4 tokens em `src/app/application/lead/tokens/`: lead-repository.token.ts, place-finder.token.ts, contact-dispatcher.token.ts, message-template.token.ts. Cada um importa a interface correspondente type-only e cria InjectionToken<T>. Conforme Seção 2.4.8.
```

### Fase 11 — Use Cases (1 item por use case com I/O DTOs)

```
[x] 36. Criar pasta `src/app/application/lead/use-cases/search-leads/` com search-leads.input.dto.ts, search-leads.output.dto.ts, e search-leads.use-case.ts implementando a orquestração da Seção 2.4.2. + spec completo da Seção 6.5.

[x] 37. Criar pasta `src/app/application/lead/use-cases/create-lead/` com I/O DTOs e use case conforme Seção 2.4.3. + spec.

[x] 38. Criar pasta `src/app/application/lead/use-cases/update-lead-status/` com I/O DTOs e use case conforme Seção 2.4.4. + spec.

[ ] 39. Criar pasta `src/app/application/lead/use-cases/delete-lead/` com I/O DTOs e use case conforme Seção 2.4.5. + spec.

[ ] 40. Criar pasta `src/app/application/lead/use-cases/send-whatsapp/` com I/O DTOs e use case conforme Seção 2.4.6. + spec.

[ ] 41. Criar pasta `src/app/application/lead/use-cases/send-email/` com I/O DTOs e use case conforme Seção 2.4.7. + spec.

[ ] 42. Criar `src/app/application/lead/index.ts` reexportando tokens, todos os use cases, DTOs, mapper.
```

### Fase 12 — Infrastructure: Supabase

```
[ ] 43. Criar `src/app/infrastructure/config/environment.config.ts` que lê de src/environments/environment.ts e expõe SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTIONS_URL como constantes tipadas.

[ ] 44. Criar `src/app/environments/environment.ts` e `environment.development.ts` com placeholders. Adicionar `.env.example` na raiz documentando as variáveis necessárias.

[ ] 45. Criar `src/app/infrastructure/supabase/client/supabase.client.ts` como @Injectable que expõe instância única do SupabaseClient via createClient. Usar configuração do environment.config.

[ ] 46. Criar `src/app/infrastructure/supabase/mappers/lead.mapper.ts` com métodos toDomain(row) e toRow(lead). Mapeia entre row do Supabase e Lead entity. + spec completo da Seção 6.6 incluindo teste roundtrip.

[ ] 47. Criar `src/app/infrastructure/supabase/repositories/lead.supabase-repository.ts` implementando LeadRepository. Usar supabase.client. Capturar erro PostgreSQL 23505 e converter em DuplicateLeadError. + spec contra Supabase local (rodar `supabase start` primeiro).
```

### Fase 13 — Infrastructure: Google Places via Edge Function

```
[ ] 48. Criar Edge Function `supabase/functions/places-search/index.ts` em Deno. Recebe POST com { sector, city }, monta query Google Places Text Search, retorna array de resultados normalizados conforme PlaceFinderResponseDto. Variável de ambiente GOOGLE_PLACES_API_KEY. CORS habilitado pro domínio Vercel.

[ ] 49. Configurar secret no Supabase local: `supabase secrets set GOOGLE_PLACES_API_KEY=<key>`. Documentar processo em README.md.

[ ] 50. Criar `src/app/infrastructure/google-places/place-finder.response.dto.ts` com interface do payload retornado pela Edge Function.

[ ] 51. Criar `src/app/infrastructure/google-places/place-finder.mapper.ts` que converte response da Edge Function em PlaceFinderResult[]. Tratar rating null, address null, hasWebsite false como defaults. + spec.

[ ] 52. Criar `src/app/infrastructure/google-places/place-finder.http-service.ts` como @Injectable que implementa PlaceFinderService. Usar Angular HttpClient. POST para Edge Function URL. Capturar erros HTTP e network, converter em PlaceFinderUnavailableError. + spec.
```

### Fase 14 — Infrastructure: Messaging

```
[ ] 53. Criar `src/app/infrastructure/messaging/whatsapp.dispatcher.ts` que constrói URL wa.me/55<digits>?text=<encoded> e abre via window.open. Retorna { url }. Lança DispatchFailedError se window.open retornar null. + spec.

[ ] 54. Criar `src/app/infrastructure/messaging/email.dispatcher.ts` que constrói mailto:<email>?subject=<encoded>&body=<encoded> e abre via window.open. Trata subject null omitindo do query string. + spec.

[ ] 55. Criar `src/app/infrastructure/messaging/contact-dispatcher.composite.ts` como @Injectable que implementa ContactDispatcherService, delegando para whatsapp.dispatcher ou email.dispatcher conforme método chamado.
```

### Fase 15 — Infrastructure: Templates

```
[ ] 56. Criar `src/app/infrastructure/templates/message-template.in-memory-service.ts` como @Injectable que implementa MessageTemplateService. Templates default hardcoded espelhando DEFAULT_WA_TEMPLATE, DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_BODY do JSX (linhas 36-38). render() faz string.replaceAll dos placeholders {{nome}}, {{setor}}, {{cidade}}. + spec.
```

### Fase 16 — Infrastructure: Providers

```
[ ] 57. Criar `src/app/infrastructure/providers/infrastructure.providers.ts` que exporta função makeInfrastructureProviders() retornando EnvironmentProviders via makeEnvironmentProviders. Binda os 4 tokens (LEAD_REPOSITORY, PLACE_FINDER, CONTACT_DISPATCHER, MESSAGE_TEMPLATE) às implementações concretas.

[ ] 58. Criar `src/app/infrastructure/index.ts` reexportando apenas makeInfrastructureProviders (única superfície pública).
```

### Fase 17 — Presentation: Estilos Globais

```
[ ] 59. Criar `src/styles/_tokens.scss` com CSS variables para cores (espelhar palette do JSX: #0a0a0f bg, #6366f1 primary, #4ade80 success, #facc15 warning, #f87171 danger, #60a5fa info, #a78bfa accent), espaçamento (--space-xs 4px, sm 8px, md 16px, lg 24px, xl 32px), tipografia (--font-sans 'DM Sans', --font-display 'Syne'), radius (--radius-sm 6px, md 10px, lg 14px).

[ ] 60. Criar `src/styles/_reset.scss` com reset minimalista (box-sizing border-box, margin/padding 0, font-family herdada).

[ ] 61. Criar `src/styles/_mixins.scss` com mixins úteis (card-base, button-base, focus-ring).

[ ] 62. Criar `src/styles/_typography.scss` com escala tipográfica usando os tokens.

[ ] 63. Criar `src/styles/styles.scss` importando todos os parciais na ordem: reset → tokens → typography → mixins. Importar fontes DM Sans e Syne via @import url do Google Fonts no topo.
```

### Fase 18 — Presentation: Shared Components

```
[ ] 64. Criar componente Button em `src/app/presentation/shared/components/button/` com variants primary/secondary/danger/ghost via @Input. Standalone. SCSS próprio usando tokens. + spec smoke.

[ ] 65. Criar componente Input em `src/app/presentation/shared/components/input/` com label, error, placeholder, two-way binding via model() signal. + spec smoke.

[ ] 66. Criar componente Select em `src/app/presentation/shared/components/select/` com options via @Input e change via @Output. + spec smoke.

[ ] 67. Criar componente Badge em `src/app/presentation/shared/components/badge/` com color via @Input (mapeia para CSS class). + spec smoke.

[ ] 68. Criar componente Card em `src/app/presentation/shared/components/card/` como wrapper com ng-content. + spec smoke.

[ ] 69. Criar componente EmptyState em `src/app/presentation/shared/components/empty-state/` com title, message, icon via @Input.

[ ] 70. Criar componente Spinner em `src/app/presentation/shared/components/spinner/` (overlay de loading).

[ ] 71. Criar `src/app/presentation/shared/pipes/phone-format.pipe.ts` formatando 10 ou 11 dígitos em (XX) XXXXX-XXXX ou (XX) XXXX-XXXX. + spec completo da Seção 6.7.
```

### Fase 19 — Presentation: Layout

```
[ ] 72. Criar `src/app/presentation/layout/header/header.component.ts` standalone com título ProspectAI e contador de leads (vai receber via @Input). SCSS espelhando estilo do JSX (logo + linha sutil embaixo).

[ ] 73. Criar `src/app/presentation/layout/nav/nav.component.ts` standalone com 3 botões de navegação (Search, Pipeline, Add Lead) usando RouterLink e RouterLinkActive. Estilo dos nav-btn do JSX linhas 267-269.
```

### Fase 20 — Presentation: Feature Search

```
[ ] 74. Criar `src/app/presentation/features/search/store/search.store.ts` como signalStore (NgRx Signals) com state: { results: SearchLeadsResultItem[], loading: boolean, error: string | null, selectedSector: string | null, city: string }. Métodos: setSelectedSector, setCity, executeSearch (chama SearchLeadsUseCase via inject). + spec.

[ ] 75. Criar `src/app/presentation/features/search/components/search-form/search-form.component.ts` com grid de 10 sectors (com ícones) + input de city + botão Buscar. Standalone. Usa Input e Button shared. Sector→icon map em constants. + spec smoke.

[ ] 76. Criar `src/app/presentation/features/search/components/search-result-card/search-result-card.component.ts` que exibe resultado de uma adição (added/skipped) com cor diferente. + spec smoke.

[ ] 77. Criar `src/app/presentation/features/search/pages/search.page.ts` que provê SearchStore e renderiza search-form + lista de search-result-card baseada em store.results. + spec smoke.

[ ] 78. Criar `src/app/presentation/features/search/search.routes.ts` exportando rotas com path: '' apontando para SearchPage (lazy).
```

### Fase 21 — Presentation: Feature Pipeline

```
[ ] 79. Criar `src/app/presentation/features/pipeline/store/pipeline.store.ts` como signalStore com state: { leads: LeadDto[], filterStatus, searchQuery, sortBy, loading, error }. Métodos: loadLeads, updateStatus, deleteLead, sendWhatsApp, sendEmail (todos chamam respectivos use cases). Computed signals: filteredLeads, statsByStatus. + spec.

[ ] 80. Criar `src/app/presentation/features/pipeline/components/lead-card/lead-card.component.ts` com avatar (ícone do setor), nome, badge de status, contactCount, indicador stale (3 dias). Botões: WhatsApp, E-mail, Remover, transições de status. + spec da Seção 6.7.

[ ] 81. Criar `src/app/presentation/features/pipeline/components/pipeline-column/pipeline-column.component.ts` que recebe status e leads filtrados, exibe lista de lead-cards. + spec smoke.

[ ] 82. Criar `src/app/presentation/features/pipeline/pages/pipeline.page.ts` que provê PipelineStore, renderiza barra de filtros (busca, sort, filter por status) + lista de leads. Carrega leads no ngOnInit via store.loadLeads(). + spec smoke.

[ ] 83. Criar `src/app/presentation/features/pipeline/pipeline.routes.ts` com rota lazy.
```

### Fase 22 — Presentation: Feature Add Lead

```
[ ] 84. Criar `src/app/presentation/features/add-lead/store/add-lead.store.ts` como signalStore com state: { form, loading, error }. Métodos: updateField, submit (chama CreateLeadUseCase). + spec.

[ ] 85. Criar `src/app/presentation/features/add-lead/components/add-lead-form/add-lead-form.component.ts` com inputs: businessName, sector (dropdown obrigatório!), city, phone (opcional), email (opcional). Validação visual: phone OU email obrigatório, sector obrigatório. + spec smoke.

[ ] 86. Criar `src/app/presentation/features/add-lead/pages/add-lead.page.ts` que provê AddLeadStore, renderiza add-lead-form e redireciona pra /pipeline após sucesso. + spec smoke.

[ ] 87. Criar `src/app/presentation/features/add-lead/add-lead.routes.ts` com rota lazy.
```

### Fase 23 — Bootstrap da App

```
[ ] 88. Atualizar `src/app/app.routes.ts` com rotas lazy para search (default ''), pipeline ('pipeline'), add-lead ('add'), e redirect '**' → ''.

[ ] 89. Atualizar `src/app/app.config.ts` adicionando: provideRouter(appRoutes), provideHttpClient(), provideZoneChangeDetection({ eventCoalescing: true }), makeInfrastructureProviders().

[ ] 90. Atualizar `src/app/app.component.ts` para renderizar <app-header />, <app-nav />, <router-outlet /> dentro de container styled. Importar standalone components. Importar styles.scss em src/styles.scss.

[ ] 91. Verificar que `pnpm start` sobe a app sem erros e que a navegação entre as 3 features funciona.
```

### Fase 24 — Validação End-to-End

```
[ ] 92. Rodar `pnpm test` completo. Confirmar que todos os specs passam. Reportar coverage de domain + application.

[ ] 93. Rodar `pnpm build --configuration=production`. Confirmar build verde sem warnings críticos.

[ ] 94. Rodar `pnpm lint` e confirmar que regras boundaries não acusam violações.

[ ] 95. Teste manual: (a) buscar Salões em Niterói via Edge Function real, (b) adicionar lead manual, (c) mover lead novo→contatado, (d) clicar WhatsApp em lead com phone, (e) confirmar contactCount incrementado e auto-transição se status era novo.
```

---

## Apêndice: Próximos Passos Práticos

### Como executar o plano

1. **Versionar este arquivo:** `PROSPECT_AI_PLAN.md` vai na raiz do repositório novo. Todo prompt do Claude Code deve referenciá-lo via path absoluto. O arquivo é o **contrato** entre você e o Codex.

2. **Primeiro prompt no Codex:**
   ```
   Leia /caminho/para/PROSPECT_AI_PLAN.md e execute o item [ ] 1
   da Seção 8 (Fase 0 — Setup e Tooling). Não execute itens
   posteriores. Pare após confirmar que `pnpm install` rodou
   sem erros e que a estrutura do Angular CLI foi criada.
   ```

3. **Cadência sugerida:**
   - **Fases 0–7 (itens 1–29):** 1–2 dias. Setup + domain layer completo (zero dependência externa).
   - **Fases 8–11 (itens 30–42):** 1 dia. Application layer completa.
   - **Fases 12–16 (itens 43–58):** 1–2 dias. Infrastructure (Supabase + Edge Function + messaging).
   - **Fases 17–22 (itens 59–87):** 1–2 dias. Presentation (UI completa).
   - **Fases 23–24 (itens 88–95):** 0.5 dia. Bootstrap + validação E2E.

   **Total estimado: 4–6 dias de trabalho focado.**

### Regras de ouro para conversar com o Codex

- **Cite o item por número:** "execute o item 18" é mais claro que "implemente o LeadStatus".
- **Não pule itens:** dependências técnicas existem mesmo quando não óbvias. Se quiser pular, pergunte primeiro.
- **Rode `pnpm test` após cada fase:** evita acúmulo de bugs silenciosos.
- **Valide a estrutura de pastas após cada item:** comparar com a Seção 5 do plano evita drift.
- **Se o Codex propuser desvio do plano:** pare, leia a proposta, decida conscientemente. Não aceite mudanças "para simplificar" sem entender o trade-off.

### Quando atualizar este documento

- **Decisão de produto muda:** registre como `[CORREÇÃO]` na Seção 1 e ajuste as seções afetadas.
- **Risco se materializou:** mova para a seção apropriada do código com TODO comentado, atualize Seção 7.
- **Use case novo:** adicione I/O DTOs em Seção 2.4, atualize mapa de dependências (Seção 3) e estrutura de pastas (Seção 5).
- **Migration nova:** registre em uma subseção da Seção 4. NUNCA edite migration já aplicada.

### Roadmap pós-MVP (não-vinculante)

Itens que ficaram fora do MVP, ordenados pela ordem provável de aparecer:

1. **Auth real (v1.1):** swap da policy `mvp_open_access` por owner-based. Backfill de `created_by`. Login com Supabase Auth.
2. **Templates persistidos (v1.2):** entidade `MessageTemplate`, tabela `message_templates`, use cases de CRUD.
3. **Notes com timeline (v1.3):** `Note[]` com timestamp por entrada, em vez de string única.
4. **Stale threshold configurável (v1.4):** store de preferências do usuário, persistido no Supabase.
5. **Email transacional via API (v2.0):** trocar mailto: por SendGrid/Resend. Tracking de aberturas.
6. **Multi-usuário com plano pago (v2.0):** Stripe + roles + RLS por organização.

---

*Documento mestre do ProspectAI — Maio 2026 — Paulo + Claude Opus*

import type { Lead } from '../entities/lead.entity';
import type { LeadId } from '../value-objects/lead-id.vo';
import type { LeadStatus } from '../value-objects/lead-status.vo';
import type { PhoneNumber } from '../value-objects/phone-number.vo';
import type { Sector } from '../value-objects/sector.vo';

export type LeadSortField = 'createdAt' | 'rating' | 'contactCount' | 'lastContactAt';

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
   * Constraint de duplicata do JSX (linhas 72-76 e 203):
   * mesmo phone normalizado (só dígitos) + mesma city (lowercase) => duplicata.
   */
  existsByPhoneAndCity(phone: PhoneNumber, city: string): Promise<boolean>;

  /** Lança LeadNotFoundError se não existir. */
  delete(id: LeadId): Promise<void>;

  count(filter?: LeadFilter): Promise<number>;

  /** Agregação usada na barra de stats da view pipeline. */
  statsByStatus(): Promise<LeadStatsByStatus>;
}

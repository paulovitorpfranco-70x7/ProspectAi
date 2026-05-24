import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DuplicateLeadError } from '@domain/lead/errors/duplicate-lead.error';
import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import type {
  LeadFilter,
  LeadRepository,
  LeadStatsByStatus,
} from '@domain/lead/repositories/lead.repository';
import type { Lead } from '@domain/lead/entities/lead.entity';
import type { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import type { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import type { Database } from '../types/database.types';
import { SupabaseClientService } from '../client/supabase.client';
import { SupabaseLeadMapper } from '../mappers/lead.mapper';

type LeadSortColumn = 'created_at' | 'rating' | 'contact_count' | 'last_contact_at';
type LeadStatusValue = Database['public']['Enums']['lead_status'];
type FilterableQuery<TSelf> = {
  eq(column: string, value: unknown): TSelf;
  or(filters: string): TSelf;
};

const SORT_COLUMN_BY_FIELD: Record<NonNullable<LeadFilter['sortBy']>, LeadSortColumn> = {
  createdAt: 'created_at',
  rating: 'rating',
  contactCount: 'contact_count',
  lastContactAt: 'last_contact_at',
};

@Injectable()
export class LeadSupabaseRepository implements LeadRepository {
  private readonly supabaseClient = inject(SupabaseClientService);
  private readonly supabase: SupabaseClient<Database> = this.supabaseClient.client;

  async save(lead: Lead): Promise<void> {
    const row = SupabaseLeadMapper.toRow(lead);
    const { error } = await this.supabase.from('leads').upsert(row, { onConflict: 'id' });

    if (error !== null) {
      if (error.code === '23505') {
        throw new DuplicateLeadError(row.phone_digits ?? '', row.city);
      }

      throw error;
    }
  }

  async findById(id: LeadId): Promise<Lead | null> {
    const { data, error } = await this.supabase
      .from('leads')
      .select('*')
      .eq('id', id.getValue())
      .maybeSingle();

    if (error !== null) {
      throw error;
    }

    return data === null ? null : SupabaseLeadMapper.toDomain(data);
  }

  async findAll(filter: LeadFilter = {}): Promise<readonly Lead[]> {
    let query = this.supabase.from('leads').select('*');
    query = this.applyFilters(query, filter);

    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';
    query = query.order(SORT_COLUMN_BY_FIELD[sortBy], {
      ascending: sortOrder === 'asc',
      nullsFirst: false,
    });

    if (filter.offset !== undefined || filter.limit !== undefined) {
      const from = filter.offset ?? 0;
      const to = filter.limit === undefined ? undefined : from + filter.limit - 1;
      query = to === undefined ? query.range(from, 1_000_000_000) : query.range(from, to);
    }

    const { data, error } = await query;

    if (error !== null) {
      throw error;
    }

    return data.map((row) => SupabaseLeadMapper.toDomain(row));
  }

  async existsByPhoneAndCity(phone: PhoneNumber, city: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('phone_digits', phone.getValue())
      .eq('city_normalized', city.trim().toLowerCase());

    if (error !== null) {
      throw error;
    }

    return (count ?? 0) > 0;
  }

  async delete(id: LeadId): Promise<void> {
    const { count, error } = await this.supabase
      .from('leads')
      .delete({ count: 'exact' })
      .eq('id', id.getValue());

    if (error !== null) {
      throw error;
    }

    if ((count ?? 0) === 0) {
      throw new LeadNotFoundError(id.getValue());
    }
  }

  async count(filter: LeadFilter = {}): Promise<number> {
    let query = this.supabase.from('leads').select('id', { count: 'exact', head: true });
    query = this.applyFilters(query, filter);

    const { count, error } = await query;

    if (error !== null) {
      throw error;
    }

    return count ?? 0;
  }

  async statsByStatus(): Promise<LeadStatsByStatus> {
    const { data, error } = await this.supabase.from('leads').select('status');

    if (error !== null) {
      throw error;
    }

    const stats = {
      total: data.length,
      novo: 0,
      contatado: 0,
      proposta: 0,
      fechado: 0,
      descartado: 0,
    };

    for (const row of data) {
      stats[row.status] += 1;
    }

    return stats;
  }

  private applyFilters<TQuery extends FilterableQuery<TQuery>>(
    query: TQuery,
    filter: LeadFilter,
  ): TQuery {
    let filtered = query;

    if (filter.status !== undefined) {
      filtered = filtered.eq('status', filter.status.getValue() as LeadStatusValue);
    }

    if (filter.sector !== undefined) {
      filtered = filtered.eq('sector', filter.sector.getValue());
    }

    if (filter.city !== undefined) {
      filtered = filtered.eq('city_normalized', filter.city.trim().toLowerCase());
    }

    if (filter.hasWebsite !== undefined) {
      filtered = filtered.eq('has_website', filter.hasWebsite);
    }

    if (filter.textQuery !== undefined && filter.textQuery.trim().length > 0) {
      const pattern = `%${filter.textQuery.trim()}%`;
      filtered = filtered.or(
        `business_name.ilike.${pattern},city.ilike.${pattern},sector.ilike.${pattern}`,
      );
    }

    return filtered;
  }
}

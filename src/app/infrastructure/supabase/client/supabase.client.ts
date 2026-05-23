import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config/environment.config';
import type { Database } from '../types/database.types';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly client: SupabaseClient<Database>;

  constructor() {
    this.client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

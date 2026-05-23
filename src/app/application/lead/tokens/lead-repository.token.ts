import { InjectionToken } from '@angular/core';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';

export const LEAD_REPOSITORY = new InjectionToken<LeadRepository>('LEAD_REPOSITORY');

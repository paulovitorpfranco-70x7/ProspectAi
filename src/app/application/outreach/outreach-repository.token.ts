import { InjectionToken } from '@angular/core';
import type { OutreachRepositoryPort } from '@domain/outreach/outreach.repository';

export const OUTREACH_REPOSITORY = new InjectionToken<OutreachRepositoryPort>(
  'OUTREACH_REPOSITORY',
);

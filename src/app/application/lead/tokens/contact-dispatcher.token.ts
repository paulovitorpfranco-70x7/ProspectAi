import { InjectionToken } from '@angular/core';
import type { ContactDispatcherService } from '@domain/lead/services/contact-dispatcher.service';

export const CONTACT_DISPATCHER = new InjectionToken<ContactDispatcherService>(
  'CONTACT_DISPATCHER',
);

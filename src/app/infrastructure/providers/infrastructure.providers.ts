import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  CONTACT_DISPATCHER,
  LEAD_REPOSITORY,
  MESSAGE_TEMPLATE,
  PLACE_FINDER,
} from '@application/lead';
import { OUTREACH_REPOSITORY } from '@application/outreach/outreach-repository.token';
import { PlaceFinderHttpService } from '../google-places/place-finder.http-service';
import { ContactDispatcherComposite } from '../messaging/contact-dispatcher.composite';
import { LeadSupabaseRepository } from '../supabase/repositories/lead.supabase-repository';
import { MessageTemplateInMemoryService } from '../templates/message-template.in-memory-service';
import { OutreachRepository } from '../outreach/outreach.repository';

export function makeInfrastructureProviders(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(),
    { provide: LEAD_REPOSITORY, useClass: LeadSupabaseRepository },
    { provide: PLACE_FINDER, useClass: PlaceFinderHttpService },
    { provide: CONTACT_DISPATCHER, useClass: ContactDispatcherComposite },
    { provide: MESSAGE_TEMPLATE, useClass: MessageTemplateInMemoryService },
    { provide: OUTREACH_REPOSITORY, useExisting: OutreachRepository },
    OutreachRepository,
  ]);
}

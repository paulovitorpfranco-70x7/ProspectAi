import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  CONTACT_DISPATCHER,
  CreateLeadUseCase,
  DeleteLeadUseCase,
  LEAD_REPOSITORY,
  MESSAGE_TEMPLATE,
  PLACE_FINDER,
  SearchLeadsUseCase,
  SendEmailUseCase,
  SendWhatsAppUseCase,
  UpdateLeadStatusUseCase,
} from '@application/lead';
import { makeInfrastructureProviders } from '@infrastructure/index';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(),
    makeInfrastructureProviders(),
    {
      provide: SearchLeadsUseCase,
      useFactory: () => new SearchLeadsUseCase(inject(LEAD_REPOSITORY), inject(PLACE_FINDER)),
    },
    {
      provide: CreateLeadUseCase,
      useFactory: () => new CreateLeadUseCase(inject(LEAD_REPOSITORY)),
    },
    {
      provide: UpdateLeadStatusUseCase,
      useFactory: () => new UpdateLeadStatusUseCase(inject(LEAD_REPOSITORY)),
    },
    {
      provide: DeleteLeadUseCase,
      useFactory: () => new DeleteLeadUseCase(inject(LEAD_REPOSITORY)),
    },
    {
      provide: SendWhatsAppUseCase,
      useFactory: () =>
        new SendWhatsAppUseCase(
          inject(LEAD_REPOSITORY),
          inject(CONTACT_DISPATCHER),
          inject(MESSAGE_TEMPLATE),
        ),
    },
    {
      provide: SendEmailUseCase,
      useFactory: () =>
        new SendEmailUseCase(
          inject(LEAD_REPOSITORY),
          inject(CONTACT_DISPATCHER),
          inject(MESSAGE_TEMPLATE),
        ),
    },
  ],
};

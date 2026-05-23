import { Injectable } from '@angular/core';
import type {
  ContactDispatcherService,
  DispatchResult,
  EmailDispatchInput,
  WhatsAppDispatchInput,
} from '@domain/lead/services/contact-dispatcher.service';
import { EmailDispatcher } from './email.dispatcher';
import { WhatsAppDispatcher } from './whatsapp.dispatcher';

@Injectable({ providedIn: 'root' })
export class ContactDispatcherComposite implements ContactDispatcherService {
  private readonly whatsappDispatcher = new WhatsAppDispatcher();
  private readonly emailDispatcher = new EmailDispatcher();

  dispatchWhatsApp(input: WhatsAppDispatchInput): DispatchResult {
    return this.whatsappDispatcher.dispatch(input);
  }

  dispatchEmail(input: EmailDispatchInput): DispatchResult {
    return this.emailDispatcher.dispatch(input);
  }
}

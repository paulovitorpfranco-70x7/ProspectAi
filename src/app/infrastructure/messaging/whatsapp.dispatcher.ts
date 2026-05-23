import { DispatchFailedError } from '@domain/lead/errors/dispatch-failed.error';
import type { DispatchResult, WhatsAppDispatchInput } from '@domain/lead/services/contact-dispatcher.service';

const MAX_WHATSAPP_BODY_LENGTH = 3500;

export class WhatsAppDispatcher {
  dispatch(input: WhatsAppDispatchInput): DispatchResult {
    const body = input.message.body.slice(0, MAX_WHATSAPP_BODY_LENGTH);
    const url = `https://wa.me/${input.phoneWhatsAppDigits}?text=${encodeURIComponent(body)}`;
    const openedWindow = window.open(url, '_blank');

    if (openedWindow === null) {
      throw new DispatchFailedError('whatsapp', 'window.open returned null');
    }

    return { url };
  }
}

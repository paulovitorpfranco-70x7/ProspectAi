import { DispatchFailedError } from '@domain/lead/errors/dispatch-failed.error';
import type { DispatchResult, EmailDispatchInput } from '@domain/lead/services/contact-dispatcher.service';

const MAX_EMAIL_BODY_LENGTH = 1800;

export class EmailDispatcher {
  dispatch(input: EmailDispatchInput): DispatchResult {
    const body = input.message.body.slice(0, MAX_EMAIL_BODY_LENGTH);
    const params = new URLSearchParams();

    if (input.message.subject !== null) {
      params.set('subject', input.message.subject);
    }

    params.set('body', body);

    const queryString = params.toString();
    const url = `mailto:${input.to}${queryString.length > 0 ? `?${queryString}` : ''}`;
    const openedWindow = window.open(url, '_blank');

    if (openedWindow === null) {
      throw new DispatchFailedError('email', 'window.open returned null');
    }

    return { url };
  }
}

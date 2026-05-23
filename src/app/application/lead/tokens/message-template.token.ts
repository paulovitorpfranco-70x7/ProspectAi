import { InjectionToken } from '@angular/core';
import type { MessageTemplateService } from '@domain/lead/services/message-template.service';

export const MESSAGE_TEMPLATE = new InjectionToken<MessageTemplateService>('MESSAGE_TEMPLATE');

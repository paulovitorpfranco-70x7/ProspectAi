import type { ContactChannel } from '../entities/lead.entity';
import type { RenderedMessage } from './contact-dispatcher.service';

export interface MessageTemplate {
  readonly channel: ContactChannel;
  /** Null para WhatsApp. Pode conter placeholders. */
  readonly subject: string | null;
  /** Suporta placeholders: {{nome}}, {{setor}}, {{cidade}}. */
  readonly body: string;
}

export interface MessageTemplateVariables {
  readonly nome: string;
  readonly setor: string;
  readonly cidade: string;
}

export interface MessageTemplateService {
  /** Retorna o template ativo para o canal. */
  getTemplate(channel: ContactChannel): MessageTemplate;

  /** Substitui placeholders. Placeholders desconhecidos permanecem literais. */
  render(template: MessageTemplate, vars: MessageTemplateVariables): RenderedMessage;
}

import { Injectable } from '@angular/core';
import type {
  MessageTemplate,
  MessageTemplateService,
  MessageTemplateVariables,
} from '@domain/lead/services/message-template.service';
import type { ContactChannel } from '@domain/lead/entities/lead.entity';
import type { RenderedMessage } from '@domain/lead/services/contact-dispatcher.service';

const WHATSAPP_TEMPLATE: MessageTemplate = {
  channel: 'whatsapp',
  subject: null,
  body:
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer ainda mais visibilidade e credibilidade, facilitando o contato dos pacientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
};

const EMAIL_TEMPLATE: MessageTemplate = {
  channel: 'email',
  subject: 'Proposta de Site para {{nome}}',
  body:
    'Olá, tudo bem?\n\nVi que o {{nome}}, em {{cidade}}, atua no segmento de {{setor}} e gostaria de apresentar uma solução rápida e acessível para criar um site profissional.\n\nUm site pode ajudar novos clientes a encontrarem sua empresa, conhecerem seus serviços e entrarem em contato com mais facilidade.\n\nPodemos conversar para eu te mostrar uma proposta objetiva?\n\nAtenciosamente,',
};

@Injectable({ providedIn: 'root' })
export class MessageTemplateInMemoryService implements MessageTemplateService {
  getTemplate(channel: ContactChannel): MessageTemplate {
    return channel === 'whatsapp' ? WHATSAPP_TEMPLATE : EMAIL_TEMPLATE;
  }

  render(template: MessageTemplate, vars: MessageTemplateVariables): RenderedMessage {
    return {
      subject: template.subject === null ? null : this.replaceVariables(template.subject, vars),
      body: this.replaceVariables(template.body, vars),
    };
  }

  private replaceVariables(value: string, vars: MessageTemplateVariables): string {
    return value
      .replaceAll('{{nome}}', vars.nome)
      .replaceAll('{{setor}}', vars.setor)
      .replaceAll('{{cidade}}', vars.cidade);
  }
}

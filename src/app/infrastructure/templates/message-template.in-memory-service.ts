import { Injectable } from '@angular/core';
import type {
  MessageTemplate,
  MessageTemplateService,
  MessageTemplateVariables,
} from '@domain/lead/services/message-template.service';
import type { ContactChannel } from '@domain/lead/entities/lead.entity';
import type { RenderedMessage } from '@domain/lead/services/contact-dispatcher.service';
import type { SectorValue } from '@domain/lead/value-objects/sector.vo';
import { renderTemplate } from '@domain/outreach/render';

const WHATSAPP_TEMPLATE_BY_SECTOR: Record<SectorValue, MessageTemplate> = {
  'Clínicas & Consultórios': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer ainda mais visibilidade e credibilidade, facilitando o contato dos pacientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Clínicas de Estética': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia valorizar ainda mais seus tratamentos e atrair novas clientes, com galeria de resultados e agendamento fácil. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Clínicas Veterinárias & Pet': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer mais visibilidade e facilitar o contato dos tutores, com seus serviços e localização sempre à mão. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Psicólogos & Terapeutas': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi seu perfil no Google e achei que um site profissional poderia transmitir ainda mais confiança e facilitar o agendamento das sessões. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Fisioterapia & Pilates': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia atrair mais alunos e pacientes, mostrando sua estrutura e facilitando o agendamento. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  Odontologia: {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer mais credibilidade e facilitar o agendamento dos pacientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Salões & Barbearias': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia trazer ainda mais visibilidade e clientes para vocês. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Salões Femininos': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia valorizar seu trabalho e atrair mais clientes, com galeria e agendamento direto pelo WhatsApp. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Nail Designers': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi seu trabalho no Google e achei que um site profissional poderia mostrar seu portfólio e facilitar os agendamentos das clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Estúdios de Tatuagem': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia destacar o portfólio dos artistas e atrair mais clientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  Restaurantes: {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia atrair mais clientes, com cardápio online, fotos dos pratos e localização fácil. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Lanchonetes & Hamburguerias': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site com cardápio e pedido fácil pelo WhatsApp poderia trazer mais clientes para vocês. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Padarias & Confeitarias': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia mostrar seus produtos e encomendas, atraindo mais clientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Marmitarias & Delivery': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site com cardápio e pedidos pelo WhatsApp poderia facilitar muito para seus clientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Oficinas Mecânicas': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer mais visibilidade e clientes, com seus serviços e contato sempre à mão. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Academias & Estúdios': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia atrair mais alunos, mostrando sua estrutura, modalidades e planos. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Fotógrafos & Estúdios': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi seu trabalho no Google e achei que um site profissional poderia destacar seu portfólio e atrair mais clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Serviços Domésticos': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia trazer mais visibilidade e facilitar o contato dos clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  Advocacia: {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia transmitir mais credibilidade e facilitar o contato de novos clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  },
  Contabilidade: {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia trazer mais credibilidade e novos clientes para o escritório. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Escolas & Cursos': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia atrair mais alunos, mostrando seus cursos e facilitando as matrículas. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
  'Igrejas & Ministérios': {
    channel: 'whatsapp',
    subject: null,
    body: 'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site poderia ajudar a comunidade a se conectar, com horários de cultos, eventos e mensagens. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  },
};

const DEFAULT_WHATSAPP_TEMPLATE = WHATSAPP_TEMPLATE_BY_SECTOR['Salões & Barbearias'];

const EMAIL_TEMPLATE: MessageTemplate = {
  channel: 'email',
  subject: 'Proposta de Site para {{nome}}',
  body: 'Olá, tudo bem?\n\nVi que o {{nome}}, em {{cidade}}, atua no segmento de {{setor}} e gostaria de apresentar uma solução rápida e acessível para criar um site profissional.\n\nUm site pode ajudar novos clientes a encontrarem sua empresa, conhecerem seus serviços e entrarem em contato com mais facilidade.\n\nPodemos conversar para eu te mostrar uma proposta objetiva?\n\nAtenciosamente,',
};

@Injectable({ providedIn: 'root' })
export class MessageTemplateInMemoryService implements MessageTemplateService {
  getTemplate(channel: ContactChannel): MessageTemplate {
    return channel === 'whatsapp' ? DEFAULT_WHATSAPP_TEMPLATE : EMAIL_TEMPLATE;
  }

  getTemplateForSector(sector: SectorValue, channel: ContactChannel): MessageTemplate {
    if (channel !== 'whatsapp') {
      return this.getTemplate(channel);
    }

    return WHATSAPP_TEMPLATE_BY_SECTOR[sector] ?? this.getTemplate(channel);
  }

  render(template: MessageTemplate, vars: MessageTemplateVariables): RenderedMessage {
    const context = {
      nome: vars.nome,
      cidade: vars.cidade,
      bairro: vars.bairro ?? null,
      setor: vars.setor,
      nota: vars.nota ?? null,
      avaliacoes: vars.avaliacoes ?? null,
      previewUrl: vars.previewUrl ?? null,
      primeiroNome: vars.primeiroNome ?? null,
    };

    return {
      subject: template.subject === null ? null : renderTemplate(template.subject, context),
      body: renderTemplate(template.body, context),
    };
  }
}

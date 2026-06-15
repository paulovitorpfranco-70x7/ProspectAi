import type { SectorValue } from '@domain/lead/value-objects/sector.vo';
import { MessageTemplateInMemoryService } from './message-template.in-memory-service';

const EXPECTED_WHATSAPP_BODIES: Record<SectorValue, string> = {
  'Clínicas & Consultórios':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer ainda mais visibilidade e credibilidade, facilitando o contato dos pacientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Clínicas de Estética':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia valorizar ainda mais seus tratamentos e atrair novas clientes, com galeria de resultados e agendamento fácil. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  'Clínicas Veterinárias & Pet':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer mais visibilidade e facilitar o contato dos tutores, com seus serviços e localização sempre à mão. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Psicólogos & Terapeutas':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi seu perfil no Google e achei que um site profissional poderia transmitir ainda mais confiança e facilitar o agendamento das sessões. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  'Fisioterapia & Pilates':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia atrair mais alunos e pacientes, mostrando sua estrutura e facilitando o agendamento. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  Odontologia:
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer mais credibilidade e facilitar o agendamento dos pacientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Salões & Barbearias':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia trazer ainda mais visibilidade e clientes para vocês. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  'Salões Femininos':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia valorizar seu trabalho e atrair mais clientes, com galeria e agendamento direto pelo WhatsApp. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  'Nail Designers':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi seu trabalho no Google e achei que um site profissional poderia mostrar seu portfólio e facilitar os agendamentos das clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  'Estúdios de Tatuagem':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia destacar o portfólio dos artistas e atrair mais clientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  Restaurantes:
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia atrair mais clientes, com cardápio online, fotos dos pratos e localização fácil. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Lanchonetes & Hamburguerias':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site com cardápio e pedido fácil pelo WhatsApp poderia trazer mais clientes para vocês. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  'Padarias & Confeitarias':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia mostrar seus produtos e encomendas, atraindo mais clientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Marmitarias & Delivery':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site com cardápio e pedidos pelo WhatsApp poderia facilitar muito para seus clientes. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Oficinas Mecânicas':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia trazer mais visibilidade e clientes, com seus serviços e contato sempre à mão. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Academias & Estúdios':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia atrair mais alunos, mostrando sua estrutura, modalidades e planos. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Fotógrafos & Estúdios':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi seu trabalho no Google e achei que um site profissional poderia destacar seu portfólio e atrair mais clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  'Serviços Domésticos':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia trazer mais visibilidade e facilitar o contato dos clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  Advocacia:
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia transmitir mais credibilidade e facilitar o contato de novos clientes. Monto uma prévia de graça para você ver como ficaria. Tem 2 minutinhos pra conversar?',
  Contabilidade:
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi o {{nome}} no Google e achei que um site profissional poderia trazer mais credibilidade e novos clientes para o escritório. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Escolas & Cursos':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site profissional poderia atrair mais alunos, mostrando seus cursos e facilitando as matrículas. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
  'Igrejas & Ministérios':
    'Oi! Sou Paulo, dev web de {{cidade}}. Vi a {{nome}} no Google e achei que um site poderia ajudar a comunidade a se conectar, com horários de cultos, eventos e mensagens. Monto uma prévia de graça para vocês verem como ficaria. Tem 2 minutinhos pra conversar?',
};

describe('MessageTemplateInMemoryService', () => {
  it('getTemplateForSector should return the correct WhatsApp template for each sector', () => {
    const service = new MessageTemplateInMemoryService();

    for (const [sector, body] of Object.entries(EXPECTED_WHATSAPP_BODIES)) {
      const template = service.getTemplateForSector(sector as SectorValue, 'whatsapp');

      expect(template).toEqual({
        channel: 'whatsapp',
        subject: null,
        body,
      });
    }
  });

  it("getTemplate('whatsapp') should return Salões & Barbearias as default template", () => {
    const service = new MessageTemplateInMemoryService();

    const template = service.getTemplate('whatsapp');

    expect(template).toEqual({
      channel: 'whatsapp',
      subject: null,
      body: EXPECTED_WHATSAPP_BODIES['Salões & Barbearias'],
    });
  });

  it("getTemplate('email') should return Email default template with subject", () => {
    const service = new MessageTemplateInMemoryService();

    const template = service.getTemplate('email');

    expect(template.channel).toBe('email');
    expect(template.subject).toBe('Proposta de Site para {{nome}}');
    expect(template.body).toContain('{{cidade}}');
    expect(template.body).toContain('{{setor}}');
  });

  it('getTemplateForSector should return Email default template when channel is email', () => {
    const service = new MessageTemplateInMemoryService();

    const template = service.getTemplateForSector('Odontologia', 'email');

    expect(template).toEqual(service.getTemplate('email'));
  });

  it('render should substitute supported placeholders and preserve unknown placeholders', () => {
    const service = new MessageTemplateInMemoryService();

    const rendered = service.render(
      {
        channel: 'whatsapp',
        subject: 'Proposta para {{nome}}',
        body: '{{nome}} - {{setor}} - {{cidade}} - {{nome}} - {{desconhecido}}',
      },
      { nome: 'Acme Clinic', setor: 'Clínicas & Consultórios', cidade: 'Niterói' },
    );

    expect(rendered.subject).toBe('Proposta para Acme Clinic');
    expect(rendered.body).toBe(
      'Acme Clinic - Clínicas & Consultórios - Niterói - Acme Clinic - {{desconhecido}}',
    );
  });
});

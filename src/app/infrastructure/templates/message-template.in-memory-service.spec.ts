import { MessageTemplateInMemoryService } from './message-template.in-memory-service';

describe('MessageTemplateInMemoryService', () => {
  it("getTemplate('whatsapp') should return WhatsApp default template", () => {
    const service = new MessageTemplateInMemoryService();

    const template = service.getTemplate('whatsapp');

    expect(template.channel).toBe('whatsapp');
    expect(template.subject).toBeNull();
    expect(template.body).toContain('{{nome}}');
    expect(template.body).toContain('{{setor}}');
  });

  it("getTemplate('email') should return Email default template with subject", () => {
    const service = new MessageTemplateInMemoryService();

    const template = service.getTemplate('email');

    expect(template.channel).toBe('email');
    expect(template.subject).toBe('Proposta de Site para {{nome}}');
    expect(template.body).toContain('{{cidade}}');
  });

  it('render should substitute {{nome}} occurrences', () => {
    const service = new MessageTemplateInMemoryService();

    const rendered = service.render(
      { channel: 'email', subject: '{{nome}}', body: 'Olá {{nome}}' },
      { nome: 'Acme Clinic', setor: 'Clínicas', cidade: 'Niterói' },
    );

    expect(rendered.subject).toBe('Acme Clinic');
    expect(rendered.body).toBe('Olá Acme Clinic');
  });

  it('render should substitute {{setor}} occurrences', () => {
    const service = new MessageTemplateInMemoryService();

    const rendered = service.render(
      { channel: 'whatsapp', subject: null, body: 'Segmento: {{setor}}' },
      { nome: 'Acme Clinic', setor: 'Clínicas & Consultórios', cidade: 'Niterói' },
    );

    expect(rendered.body).toBe('Segmento: Clínicas & Consultórios');
  });

  it('render should substitute {{cidade}} occurrences', () => {
    const service = new MessageTemplateInMemoryService();

    const rendered = service.render(
      { channel: 'whatsapp', subject: null, body: 'Cidade: {{cidade}}' },
      { nome: 'Acme Clinic', setor: 'Clínicas', cidade: 'Niterói' },
    );

    expect(rendered.body).toBe('Cidade: Niterói');
  });

  it('render should leave unknown placeholders literal', () => {
    const service = new MessageTemplateInMemoryService();

    const rendered = service.render(
      { channel: 'whatsapp', subject: null, body: 'Olá {{nome}} {{desconhecido}}' },
      { nome: 'Acme Clinic', setor: 'Clínicas', cidade: 'Niterói' },
    );

    expect(rendered.body).toBe('Olá Acme Clinic {{desconhecido}}');
  });

  it('render should substitute same placeholder multiple times', () => {
    const service = new MessageTemplateInMemoryService();

    const rendered = service.render(
      { channel: 'whatsapp', subject: null, body: '{{nome}} - {{nome}} - {{cidade}} - {{cidade}}' },
      { nome: 'Acme Clinic', setor: 'Clínicas', cidade: 'Niterói' },
    );

    expect(rendered.body).toBe('Acme Clinic - Acme Clinic - Niterói - Niterói');
  });
});

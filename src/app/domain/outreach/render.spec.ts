import { assertNoOrphanTokens } from './render.guard';
import { renderTemplate } from './render';
import { CADENCE_TEMPLATES } from './templates/cadence.templates';
import type { LeadOutreachContext } from './types';

const COMPLETE_CONTEXT: LeadOutreachContext = {
  nome: 'Barbearia Central',
  cidade: 'Teresópolis',
  bairro: 'Várzea',
  setor: 'Salões & Barbearias',
  nota: 4.8,
  avaliacoes: 1234,
  previewUrl: 'https://preview.example.com/barbearia-central',
  primeiroNome: 'Carlos',
};

describe('renderTemplate', () => {
  it.each([
    ['{{nome}}', 'Barbearia Central'],
    ['{{cidade}}', 'Teresópolis'],
    ['{{bairro}}', 'Várzea'],
    ['{{setor}}', 'Salões & Barbearias'],
    ['{{nota}}', '4,8'],
    ['{{avaliacoes}}', '1234'],
    ['{{preview_url}}', 'https://preview.example.com/barbearia-central'],
    ['{{primeiro_nome}}', 'Carlos'],
  ])('should render token %s', (template, expected) => {
    expect(renderTemplate(template, COMPLETE_CONTEXT)).toBe(expected);
  });

  it.each([
    ['tem_reputacao', 'Reputação'],
    ['tem_bairro', 'Bairro'],
    ['tem_preview', 'Preview'],
  ])('should render conditional %s when enabled', (flag, content) => {
    expect(renderTemplate(`Antes {{#se ${flag}}}${content}{{/se}} Depois`, COMPLETE_CONTEXT)).toBe(
      `Antes ${content} Depois`,
    );
  });

  it.each([
    ['tem_reputacao', { nota: 4.4, avaliacoes: 100 }],
    ['tem_bairro', { bairro: null }],
    ['tem_preview', { previewUrl: null }],
  ])('should remove conditional %s when disabled', (flag, contextOverride) => {
    expect(
      renderTemplate(`Antes {{#se ${flag}}}conteúdo{{/se}} Depois`, {
        ...COMPLETE_CONTEXT,
        ...contextOverride,
      }),
    ).toBe('Antes Depois');
  });

  it.each([
    [4.8, '4,8'],
    [5, '5,0'],
  ])('should format rating %s in pt-BR', (nota, expected) => {
    expect(renderTemplate('{{nota}}', { ...COMPLETE_CONTEXT, nota })).toBe(expected);
  });

  it('should omit the reputation sentence without leaving blank lines or double spaces', () => {
    const template =
      'Início\n{{#se tem_reputacao}}Nota {{nota}} com {{avaliacoes}} avaliações.{{/se}}\nFim';

    const rendered = renderTemplate(template, { ...COMPLETE_CONTEXT, nota: null });

    expect(rendered).toBe('Início\nFim');
    expect(rendered).not.toContain('  ');
  });

  it('should use city as neighborhood fallback', () => {
    expect(renderTemplate('{{bairro}}', { ...COMPLETE_CONTEXT, bairro: null })).toBe('Teresópolis');
  });

  it('should remove a missing first name without leaving orphan punctuation', () => {
    expect(
      renderTemplate('Fala, {{primeiro_nome}}!', {
        ...COMPLETE_CONTEXT,
        primeiroNome: null,
      }),
    ).toBe('Fala!');
  });

  it('should return a template without tokens unchanged', () => {
    expect(renderTemplate('Mensagem sem tokens.', COMPLETE_CONTEXT)).toBe('Mensagem sem tokens.');
  });
});

describe('assertNoOrphanTokens', () => {
  it.each(['Token {{desconhecido}}', 'Abertura {{', 'Fechamento }}'])(
    'should reject orphan token markers in %s',
    (rendered) => {
      expect(() => assertNoOrphanTokens(rendered)).toThrow();
    },
  );

  it('should reject an excessive blank-line gap left by an empty token', () => {
    expect(() => assertNoOrphanTokens('Antes\n\n\nDepois')).toThrow(
      'O texto renderizado contém uma lacuna causada por token vazio',
    );
  });

  it('should reject m1b_direto when preview_url resolves to an empty value', () => {
    expect(() =>
      renderTemplate(
        CADENCE_TEMPLATES.m1b_direto[0] as string,
        { ...COMPLETE_CONTEXT, previewUrl: null },
        'm1b_direto',
      ),
    ).toThrow('Token obrigatório vazio no estágio m1b_direto: preview_url');
  });
});

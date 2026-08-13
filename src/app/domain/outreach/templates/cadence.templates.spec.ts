import { assertNoOrphanTokens } from '../render.guard';
import { renderTemplate } from '../render';
import { STAGE_ORDER, type AbVariant, type LeadOutreachContext } from '../types';
import { CADENCE_TEMPLATES, F1_D2_TEMPLATES, getCadenceTemplate } from './cadence.templates';

const COMPLETE_CONTEXT: LeadOutreachContext = {
  nome: 'Barbearia Central',
  cidade: 'Niterói',
  bairro: 'Icaraí',
  setor: 'Salões & Barbearias',
  nota: 4.8,
  avaliacoes: 120,
  previewUrl: 'https://preview.example.com/barbearia-central',
  primeiroNome: 'Carlos',
};

const RENDER_CONTEXTS: readonly LeadOutreachContext[] = [
  COMPLETE_CONTEXT,
  {
    ...COMPLETE_CONTEXT,
    nota: null,
    avaliacoes: null,
  },
  {
    ...COMPLETE_CONTEXT,
    bairro: null,
    primeiroNome: null,
  },
];

const FORBIDDEN_EXPRESSIONS = [
  'presença digital',
  'alavancar',
  'solução completa',
  'orçamento sem compromisso',
  'estou entrando em contato',
  'venho por meio desta',
  'prezado',
] as const;

describe('CADENCE_TEMPLATES', () => {
  it('should contain all eight stages with at least one template each', () => {
    expect(Object.keys(CADENCE_TEMPLATES)).toEqual(STAGE_ORDER);

    for (const stage of STAGE_ORDER) {
      expect(CADENCE_TEMPLATES[stage].length).toBeGreaterThan(0);
    }
  });

  it('should render every template in all required contexts without orphan tokens', () => {
    for (const stage of STAGE_ORDER) {
      for (const template of CADENCE_TEMPLATES[stage]) {
        for (const context of RENDER_CONTEXTS) {
          const rendered = renderTemplate(template, context);
          expect(() => assertNoOrphanTokens(rendered)).not.toThrow();
        }
      }
    }
  });

  it('should not contain forbidden sales vocabulary', () => {
    for (const stage of STAGE_ORDER) {
      for (const template of CADENCE_TEMPLATES[stage]) {
        const normalizedTemplate = template.toLocaleLowerCase('pt-BR');

        for (const expression of FORBIDDEN_EXPRESSIONS) {
          if (normalizedTemplate.includes(expression)) {
            throw new Error(`Estágio ${stage} contém a expressão proibida: ${expression}`);
          }
        }
      }
    }
  });

  it('should select a stable template for the same stage and lead id', () => {
    const stage = 'm1a_permissao';
    const leadId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    const expected = getCadenceTemplate(stage, leadId, 'A');

    for (let call = 0; call < 100; call += 1) {
      expect(getCadenceTemplate(stage, leadId, 'A')).toBe(expected);
    }
  });

  it('should select the explicit f1_d2 template for each A/B variant', () => {
    const leadId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

    expect(getCadenceTemplate('f1_d2', leadId, 'A')).toBe(F1_D2_TEMPLATES.A);
    expect(getCadenceTemplate('f1_d2', leadId, 'B')).toBe(F1_D2_TEMPLATES.B);
  });

  it('should keep f1_d2 variant A independent from links or page promises', () => {
    const rendered = renderTemplate(
      F1_D2_TEMPLATES.A,
      { ...COMPLETE_CONTEXT, previewUrl: null },
      'f1_d2',
      'A',
    );

    expect(rendered.toLocaleLowerCase('pt-BR')).not.toMatch(
      /https?:\/\/|\blink\b|\bpágina\b|\bsite\b/,
    );
  });

  it('should end every f1_d2 variant with a question instead of a URL', () => {
    for (const [variant, template] of Object.entries(F1_D2_TEMPLATES) as [AbVariant, string][]) {
      const context =
        variant === 'A' ? { ...COMPLETE_CONTEXT, previewUrl: null } : COMPLETE_CONTEXT;
      const rendered = renderTemplate(template, context, 'f1_d2', variant);
      const lastLine = rendered.split('\n').at(-1) ?? '';

      expect(lastLine).toMatch(/\?$/);
      expect(lastLine).not.toMatch(/^https?:\/\//);
    }
  });

  it('should remove the reputation block without rendering whitespace artifacts', () => {
    const rendered = renderTemplate(CADENCE_TEMPLATES.m1a_permissao[0] as string, {
      ...COMPLETE_CONTEXT,
      nota: null,
      avaliacoes: null,
    });

    expect(rendered).not.toContain('  ');
    expect(rendered).not.toContain(' .');
    expect(rendered).not.toContain('\n\n\n');
  });
});

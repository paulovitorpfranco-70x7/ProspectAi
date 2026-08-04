import { assertNoOrphanTokens } from '../render.guard';
import { renderTemplate } from '../render';
import { STAGE_ORDER, type LeadOutreachContext } from '../types';
import { CADENCE_TEMPLATES, getCadenceTemplate } from './cadence.templates';

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
    const expected = getCadenceTemplate(stage, leadId);

    for (let call = 0; call < 100; call += 1) {
      expect(getCadenceTemplate(stage, leadId)).toBe(expected);
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

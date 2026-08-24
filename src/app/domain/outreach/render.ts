import { assertValidRenderedMessage } from './render.guard';
import type { AbVariant, LeadOutreachContext, OutreachStage } from './types';

type ConditionalFlag = 'tem_reputacao' | 'sem_reputacao' | 'tem_bairro' | 'tem_preview';

const FALSE_BLOCK_MARKER = '\u0000outreach-false-block\u0000';
const CONDITIONAL_PATTERN =
  /{{#se\s+(tem_reputacao|sem_reputacao|tem_bairro|tem_preview)\s*}}([\s\S]*?){{\/se}}/g;

export function renderTemplate(template: string, ctx: LeadOutreachContext): string;
export function renderTemplate(
  template: string,
  ctx: LeadOutreachContext,
  stage: OutreachStage,
  variant: AbVariant,
): string;
export function renderTemplate(
  template: string,
  ctx: LeadOutreachContext,
  stage?: OutreachStage,
  variant?: AbVariant,
): string {
  const temReputacao =
    ctx.nota !== null && ctx.avaliacoes !== null && ctx.nota >= 4.5 && ctx.avaliacoes >= 20;
  const flags: Record<ConditionalFlag, boolean> = {
    tem_reputacao: temReputacao,
    sem_reputacao: !temReputacao,
    tem_bairro: ctx.bairro !== null,
    tem_preview: ctx.previewUrl !== null,
  };

  let rendered = template.replace(
    CONDITIONAL_PATTERN,
    (_match: string, flag: ConditionalFlag, content: string) =>
      flags[flag] ? content : FALSE_BLOCK_MARKER,
  );

  if (ctx.primeiroNome === null) {
    rendered = rendered
      .replace(/,\s*{{primeiro_nome}}/g, '')
      .replace(/{{primeiro_nome}}\s*,\s*/g, '');
  }

  const tokens: Record<string, string> = {
    nome: ctx.nome,
    cidade: ctx.cidade,
    bairro: ctx.bairro ?? ctx.cidade,
    setor: ctx.setor,
    nota: ctx.nota === null ? '' : ctx.nota.toFixed(1).replace('.', ','),
    avaliacoes: ctx.avaliacoes === null ? '' : Math.trunc(ctx.avaliacoes).toString(),
    rating: ctx.nota === null ? '' : ctx.nota.toFixed(1).replace('.', ','),
    review_count: ctx.avaliacoes === null ? '' : Math.trunc(ctx.avaliacoes).toString(),
    procedimento: ctx.procedimento?.trim() || 'clínica de estética',
    preview_url: ctx.previewUrl ?? '',
    primeiro_nome: ctx.primeiroNome ?? '',
  };

  for (const [token, value] of Object.entries(tokens)) {
    rendered = rendered.replaceAll(`{{${token}}}`, value);
  }

  const normalized = rendered
    .replace(new RegExp(`^[ \\t]*${FALSE_BLOCK_MARKER}[ \\t]*(?:\\r?\\n|$)`, 'gm'), '')
    .replaceAll(FALSE_BLOCK_MARKER, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  if (stage !== undefined) {
    if (variant === undefined) {
      throw new Error(`Variante obrigatória para validar o estágio ${stage}`);
    }

    assertValidRenderedMessage(stage, ctx, normalized, variant);
  }

  return normalized;
}

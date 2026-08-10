import type { LeadOutreachContext, OutreachStage } from './types';

type RequiredTemplateToken = 'preview_url';

export const REQUIRED_TOKENS_BY_STAGE: Readonly<
  Record<OutreachStage, readonly RequiredTemplateToken[]>
> = {
  m1a_permissao: [],
  m1b_direto: ['preview_url'],
  m2_preview: ['preview_url'],
  m3_descoberta: [],
  m4_proposta: [],
  f1_d2: ['preview_url'],
  f2_d5: [],
  f3_d12: [],
};

const EMPTY_TOKEN_GAP_PATTERN = /(?:\r?\n[ \t]*){3,}/;

export function assertNoOrphanTokens(rendered: string): void {
  if (rendered.includes('{{') || rendered.includes('}}')) {
    throw new Error('O texto renderizado contém tokens não resolvidos');
  }

  if (EMPTY_TOKEN_GAP_PATTERN.test(rendered)) {
    throw new Error('O texto renderizado contém uma lacuna causada por token vazio');
  }
}

export function assertValidRenderedMessage(
  stage: OutreachStage,
  context: LeadOutreachContext,
  rendered: string,
): void {
  for (const token of REQUIRED_TOKENS_BY_STAGE[stage]) {
    const value = token === 'preview_url' ? context.previewUrl : null;

    if (value === null || value.trim().length === 0) {
      throw new Error(`Token obrigatório vazio no estágio ${stage}: ${token}`);
    }
  }

  assertNoOrphanTokens(rendered);
}

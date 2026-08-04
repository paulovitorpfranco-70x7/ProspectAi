import type { AbVariant, OutreachStage } from './types';

export type OutreachOutcome = 'sem_resposta' | 'respondeu_positivo' | 'perguntou_preco' | 'recusou';

type StageTransition = OutreachStage | 'encerrar';

const POSITIVE_TRANSITIONS: Record<OutreachStage, StageTransition> = {
  m1a_permissao: 'm2_preview',
  m1b_direto: 'm3_descoberta',
  m2_preview: 'm3_descoberta',
  m3_descoberta: 'm4_proposta',
  m4_proposta: 'encerrar',
  f1_d2: 'm3_descoberta',
  f2_d5: 'm3_descoberta',
  f3_d12: 'm3_descoberta',
};

const NO_RESPONSE_TRANSITIONS: Record<OutreachStage, StageTransition> = {
  m1a_permissao: 'f1_d2',
  m1b_direto: 'f1_d2',
  m2_preview: 'f1_d2',
  m3_descoberta: 'f1_d2',
  m4_proposta: 'f1_d2',
  f1_d2: 'f2_d5',
  f2_d5: 'f3_d12',
  f3_d12: 'encerrar',
};

const FOLLOWUP_DELAY_DAYS: Record<OutreachStage, number> = {
  m1a_permissao: 2,
  m1b_direto: 2,
  m2_preview: 2,
  m3_descoberta: 3,
  m4_proposta: 3,
  f1_d2: 3,
  f2_d5: 7,
  f3_d12: 0,
};

export function nextStage(
  current: OutreachStage | null,
  outcome: OutreachOutcome,
): OutreachStage | 'encerrar' {
  if (current === null) {
    return 'm1a_permissao';
  }

  if (outcome === 'recusou') {
    return 'encerrar';
  }

  if (outcome === 'perguntou_preco') {
    return 'm4_proposta';
  }

  return outcome === 'respondeu_positivo'
    ? POSITIVE_TRANSITIONS[current]
    : NO_RESPONSE_TRANSITIONS[current];
}

export function followupDelayDays(stage: OutreachStage): number {
  return FOLLOWUP_DELAY_DAYS[stage];
}

export function pickAbVariant(sequenceIndex: number): AbVariant {
  return sequenceIndex % 2 === 0 ? 'A' : 'B';
}

export function computeNextFollowup(stage: OutreachStage, sentAt: Date): Date | null {
  const delayDays = followupDelayDays(stage);

  if (delayDays === 0) {
    return null;
  }

  const nextFollowup = new Date(sentAt.getTime());
  nextFollowup.setUTCDate(nextFollowup.getUTCDate() + delayDays);
  return nextFollowup;
}

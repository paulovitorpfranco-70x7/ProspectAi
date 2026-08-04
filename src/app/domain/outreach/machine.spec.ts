import { STAGE_ORDER, type OutreachStage } from './types';
import {
  computeNextFollowup,
  followupDelayDays,
  nextStage,
  pickAbVariant,
  type OutreachOutcome,
} from './machine';

type TransitionExpectation = readonly [
  current: OutreachStage | null,
  outcome: OutreachOutcome,
  expected: OutreachStage | 'encerrar',
];

const TRANSITION_EXPECTATIONS: readonly TransitionExpectation[] = [
  [null, 'sem_resposta', 'm1a_permissao'],
  [null, 'respondeu_positivo', 'm1a_permissao'],
  [null, 'perguntou_preco', 'm1a_permissao'],
  [null, 'recusou', 'm1a_permissao'],
  ['m1a_permissao', 'sem_resposta', 'f1_d2'],
  ['m1a_permissao', 'respondeu_positivo', 'm2_preview'],
  ['m1a_permissao', 'perguntou_preco', 'm4_proposta'],
  ['m1a_permissao', 'recusou', 'encerrar'],
  ['m1b_direto', 'sem_resposta', 'f1_d2'],
  ['m1b_direto', 'respondeu_positivo', 'm3_descoberta'],
  ['m1b_direto', 'perguntou_preco', 'm4_proposta'],
  ['m1b_direto', 'recusou', 'encerrar'],
  ['m2_preview', 'sem_resposta', 'f1_d2'],
  ['m2_preview', 'respondeu_positivo', 'm3_descoberta'],
  ['m2_preview', 'perguntou_preco', 'm4_proposta'],
  ['m2_preview', 'recusou', 'encerrar'],
  ['m3_descoberta', 'sem_resposta', 'f1_d2'],
  ['m3_descoberta', 'respondeu_positivo', 'm4_proposta'],
  ['m3_descoberta', 'perguntou_preco', 'm4_proposta'],
  ['m3_descoberta', 'recusou', 'encerrar'],
  ['m4_proposta', 'sem_resposta', 'f1_d2'],
  ['m4_proposta', 'respondeu_positivo', 'encerrar'],
  ['m4_proposta', 'perguntou_preco', 'm4_proposta'],
  ['m4_proposta', 'recusou', 'encerrar'],
  ['f1_d2', 'sem_resposta', 'f2_d5'],
  ['f1_d2', 'respondeu_positivo', 'm3_descoberta'],
  ['f1_d2', 'perguntou_preco', 'm4_proposta'],
  ['f1_d2', 'recusou', 'encerrar'],
  ['f2_d5', 'sem_resposta', 'f3_d12'],
  ['f2_d5', 'respondeu_positivo', 'm3_descoberta'],
  ['f2_d5', 'perguntou_preco', 'm4_proposta'],
  ['f2_d5', 'recusou', 'encerrar'],
  ['f3_d12', 'sem_resposta', 'encerrar'],
  ['f3_d12', 'respondeu_positivo', 'm3_descoberta'],
  ['f3_d12', 'perguntou_preco', 'm4_proposta'],
  ['f3_d12', 'recusou', 'encerrar'],
];

describe('nextStage', () => {
  it.each(TRANSITION_EXPECTATIONS)(
    'should transition from %s with outcome %s to %s',
    (current, outcome, expected) => {
      expect(nextStage(current, outcome)).toBe(expected);
    },
  );

  it.each(STAGE_ORDER)('should end from %s when the lead refuses', (stage) => {
    expect(nextStage(stage, 'recusou')).toBe('encerrar');
  });

  it('should end after f3_d12 without a response', () => {
    expect(nextStage('f3_d12', 'sem_resposta')).toBe('encerrar');
  });
});

describe('followupDelayDays', () => {
  it.each([
    ['m1a_permissao', 2],
    ['m1b_direto', 2],
    ['m2_preview', 2],
    ['m3_descoberta', 3],
    ['m4_proposta', 3],
    ['f1_d2', 3],
    ['f2_d5', 7],
    ['f3_d12', 0],
  ] as const)('should return %i days for %s', (stage, expected) => {
    expect(followupDelayDays(stage)).toBe(expected);
  });
});

describe('pickAbVariant', () => {
  it('should balance 100 consecutive indexes into exactly 50 A and 50 B variants', () => {
    const variants = Array.from({ length: 100 }, (_value, index) => pickAbVariant(index));

    expect(variants.filter((variant) => variant === 'A')).toHaveLength(50);
    expect(variants.filter((variant) => variant === 'B')).toHaveLength(50);
  });
});

describe('computeNextFollowup', () => {
  it('should return null for f3_d12', () => {
    expect(computeNextFollowup('f3_d12', new Date('2026-01-30T12:00:00.000Z'))).toBeNull();
  });

  it('should not mutate the sent date', () => {
    const sentAt = new Date('2026-01-30T12:00:00.000Z');
    const originalTimestamp = sentAt.getTime();

    const result = computeNextFollowup('m3_descoberta', sentAt);

    expect(result).not.toBe(sentAt);
    expect(sentAt.getTime()).toBe(originalTimestamp);
  });

  it('should cross a month boundary correctly', () => {
    const result = computeNextFollowup('m3_descoberta', new Date('2026-01-30T12:00:00.000Z'));

    expect(result?.toISOString()).toBe('2026-02-02T12:00:00.000Z');
  });
});

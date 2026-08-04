export type OutreachStage =
  | 'm1a_permissao'
  | 'm1b_direto'
  | 'm2_preview'
  | 'm3_descoberta'
  | 'm4_proposta'
  | 'f1_d2'
  | 'f2_d5'
  | 'f3_d12';

export type AbVariant = 'A' | 'B';

export type LeadOutreachContext = {
  readonly nome: string;
  readonly cidade: string;
  readonly bairro: string | null;
  readonly setor: string;
  readonly nota: number | null;
  readonly avaliacoes: number | null;
  readonly previewUrl: string | null;
  readonly primeiroNome: string | null;
};

export type OutreachEvent = {
  readonly id: string;
  readonly leadId: string;
  readonly stage: OutreachStage;
  readonly variant: AbVariant | null;
  readonly renderedMessage: string;
  readonly sentAt: Date;
};

export const STAGE_ORDER: OutreachStage[] = [
  'm1a_permissao',
  'm1b_direto',
  'm2_preview',
  'm3_descoberta',
  'm4_proposta',
  'f1_d2',
  'f2_d5',
  'f3_d12',
];

export const STAGE_LABELS: Record<OutreachStage, string> = {
  m1a_permissao: 'Permissão para enviar prévia',
  m1b_direto: 'Envio direto da prévia',
  m2_preview: 'Entrega da prévia',
  m3_descoberta: 'Pergunta de descoberta',
  m4_proposta: 'Proposta comercial',
  f1_d2: 'Follow-up D+2',
  f2_d5: 'Follow-up D+5',
  f3_d12: 'Encerramento D+12',
};

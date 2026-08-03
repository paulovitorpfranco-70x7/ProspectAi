import { LeadStatusInvalidError } from '@domain/lead/errors/lead-status-invalid.error';

export type LeadStatusValue =
  | 'novo'
  | 'contatado'
  | 'respondeu'
  | 'preview_enviado'
  | 'proposta'
  | 'fechado'
  | 'perdido';

const VALID_TRANSITIONS: Readonly<Record<LeadStatusValue, readonly LeadStatusValue[]>> = {
  novo: ['contatado', 'perdido'],
  contatado: ['respondeu', 'novo', 'perdido'],
  respondeu: ['preview_enviado', 'contatado', 'perdido'],
  preview_enviado: ['proposta', 'respondeu', 'perdido'],
  proposta: ['fechado', 'preview_enviado', 'perdido'],
  fechado: ['proposta'],
  perdido: ['novo'],
};

const LEAD_STATUS_VALUES: readonly LeadStatusValue[] = [
  'novo',
  'contatado',
  'respondeu',
  'preview_enviado',
  'proposta',
  'fechado',
  'perdido',
];

export class LeadStatus {
  private constructor(private readonly value: LeadStatusValue) {}

  static create(value: string): LeadStatus {
    if (!LeadStatus.isLeadStatusValue(value)) {
      throw new LeadStatusInvalidError(value);
    }

    return new LeadStatus(value);
  }

  static novo(): LeadStatus {
    return new LeadStatus('novo');
  }

  static contatado(): LeadStatus {
    return new LeadStatus('contatado');
  }

  static respondeu(): LeadStatus {
    return new LeadStatus('respondeu');
  }

  static previewEnviado(): LeadStatus {
    return new LeadStatus('preview_enviado');
  }

  static proposta(): LeadStatus {
    return new LeadStatus('proposta');
  }

  static fechado(): LeadStatus {
    return new LeadStatus('fechado');
  }

  static perdido(): LeadStatus {
    return new LeadStatus('perdido');
  }

  getValue(): LeadStatusValue {
    return this.value;
  }

  canTransitionTo(target: LeadStatus): boolean {
    if (this.equals(target)) {
      return false;
    }

    return VALID_TRANSITIONS[this.value].includes(target.value);
  }

  equals(other: LeadStatus): boolean {
    return this.value === other.value;
  }

  private static isLeadStatusValue(value: string): value is LeadStatusValue {
    return LEAD_STATUS_VALUES.includes(value as LeadStatusValue);
  }
}

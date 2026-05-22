import { LeadStatusInvalidError } from '@domain/lead/errors/lead-status-invalid.error';
import { LeadStatus } from './lead-status.vo';

describe('LeadStatus', () => {
  it('factory novo/contatado/proposta/fechado/descartado should produce respective status', () => {
    expect(LeadStatus.novo().getValue()).toBe('novo');
    expect(LeadStatus.contatado().getValue()).toBe('contatado');
    expect(LeadStatus.proposta().getValue()).toBe('proposta');
    expect(LeadStatus.fechado().getValue()).toBe('fechado');
    expect(LeadStatus.descartado().getValue()).toBe('descartado');
  });

  it('create should throw for unknown status string', () => {
    expect(() => LeadStatus.create('em_andamento')).toThrow(LeadStatusInvalidError);
    expect(() => LeadStatus.create('em_andamento')).toThrow(
      'Status "em_andamento" não é um LeadStatus válido.',
    );
  });

  it('canTransitionTo: novo → contatado is allowed', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.contatado())).toBe(true);
  });

  it('canTransitionTo: novo → descartado is allowed', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.descartado())).toBe(true);
  });

  it('canTransitionTo: novo → proposta is FORBIDDEN', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.proposta())).toBe(false);
  });

  it('canTransitionTo: novo → fechado is FORBIDDEN', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.fechado())).toBe(false);
  });

  it('canTransitionTo: contatado → proposta is allowed', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.proposta())).toBe(true);
  });

  it('canTransitionTo: contatado → novo is allowed (reabertura)', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.novo())).toBe(true);
  });

  it('canTransitionTo: contatado → descartado is allowed', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.descartado())).toBe(true);
  });

  it('canTransitionTo: contatado → fechado is FORBIDDEN', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.fechado())).toBe(false);
  });

  it('canTransitionTo: proposta → fechado is allowed', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.fechado())).toBe(true);
  });

  it('canTransitionTo: proposta → contatado is allowed (recuo)', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.contatado())).toBe(true);
  });

  it('canTransitionTo: proposta → descartado is allowed', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.descartado())).toBe(true);
  });

  it('canTransitionTo: proposta → novo is FORBIDDEN', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.novo())).toBe(false);
  });

  it('canTransitionTo: fechado → proposta is allowed (reabertura)', () => {
    expect(LeadStatus.fechado().canTransitionTo(LeadStatus.proposta())).toBe(true);
  });

  it('canTransitionTo: fechado → novo is FORBIDDEN', () => {
    expect(LeadStatus.fechado().canTransitionTo(LeadStatus.novo())).toBe(false);
  });

  it('canTransitionTo: fechado → contatado is FORBIDDEN', () => {
    expect(LeadStatus.fechado().canTransitionTo(LeadStatus.contatado())).toBe(false);
  });

  it('canTransitionTo: fechado → descartado is FORBIDDEN', () => {
    expect(LeadStatus.fechado().canTransitionTo(LeadStatus.descartado())).toBe(false);
  });

  it('canTransitionTo: descartado → novo is allowed (reativação)', () => {
    expect(LeadStatus.descartado().canTransitionTo(LeadStatus.novo())).toBe(true);
  });

  it('canTransitionTo: descartado → contatado is FORBIDDEN', () => {
    expect(LeadStatus.descartado().canTransitionTo(LeadStatus.contatado())).toBe(false);
  });

  it('canTransitionTo: same status should return false', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.novo())).toBe(false);
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.contatado())).toBe(false);
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.proposta())).toBe(false);
    expect(LeadStatus.fechado().canTransitionTo(LeadStatus.fechado())).toBe(false);
    expect(LeadStatus.descartado().canTransitionTo(LeadStatus.descartado())).toBe(false);
  });

  it('equals should compare by value', () => {
    expect(LeadStatus.novo().equals(LeadStatus.novo())).toBe(true);
    expect(LeadStatus.novo().equals(LeadStatus.contatado())).toBe(false);
  });
});

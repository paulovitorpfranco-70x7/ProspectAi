import { LeadStatusInvalidError } from '@domain/lead/errors/lead-status-invalid.error';
import { LeadStatus } from './lead-status.vo';

describe('LeadStatus', () => {
  it('factories should produce every supported status', () => {
    expect(LeadStatus.novo().getValue()).toBe('novo');
    expect(LeadStatus.contatado().getValue()).toBe('contatado');
    expect(LeadStatus.respondeu().getValue()).toBe('respondeu');
    expect(LeadStatus.previewEnviado().getValue()).toBe('preview_enviado');
    expect(LeadStatus.proposta().getValue()).toBe('proposta');
    expect(LeadStatus.fechado().getValue()).toBe('fechado');
    expect(LeadStatus.perdido().getValue()).toBe('perdido');
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

  it('canTransitionTo: novo → perdido is allowed', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.perdido())).toBe(true);
  });

  it('canTransitionTo: novo → proposta is FORBIDDEN', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.proposta())).toBe(false);
  });

  it('canTransitionTo: novo → fechado is FORBIDDEN', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.fechado())).toBe(false);
  });

  it('canTransitionTo: contatado → respondeu is allowed', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.respondeu())).toBe(true);
  });

  it('canTransitionTo: contatado → novo is allowed (reabertura)', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.novo())).toBe(true);
  });

  it('canTransitionTo: contatado → perdido is allowed', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.perdido())).toBe(true);
  });

  it('canTransitionTo: contatado → fechado is FORBIDDEN', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.fechado())).toBe(false);
  });

  it('canTransitionTo: proposta → fechado is allowed', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.fechado())).toBe(true);
  });

  it('canTransitionTo: respondeu → preview_enviado is allowed', () => {
    expect(LeadStatus.respondeu().canTransitionTo(LeadStatus.previewEnviado())).toBe(true);
  });

  it('canTransitionTo: preview_enviado → proposta is allowed', () => {
    expect(LeadStatus.previewEnviado().canTransitionTo(LeadStatus.proposta())).toBe(true);
  });

  it('canTransitionTo: proposta → preview_enviado is allowed (recuo)', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.previewEnviado())).toBe(true);
  });

  it('canTransitionTo: proposta → perdido is allowed', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.perdido())).toBe(true);
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

  it('canTransitionTo: fechado → perdido is FORBIDDEN', () => {
    expect(LeadStatus.fechado().canTransitionTo(LeadStatus.perdido())).toBe(false);
  });

  it('canTransitionTo: perdido → novo is allowed (reativação)', () => {
    expect(LeadStatus.perdido().canTransitionTo(LeadStatus.novo())).toBe(true);
  });

  it('canTransitionTo: perdido → contatado is FORBIDDEN', () => {
    expect(LeadStatus.perdido().canTransitionTo(LeadStatus.contatado())).toBe(false);
  });

  it('canTransitionTo: same status should return false', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.novo())).toBe(false);
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.contatado())).toBe(false);
    expect(LeadStatus.respondeu().canTransitionTo(LeadStatus.respondeu())).toBe(false);
    expect(LeadStatus.previewEnviado().canTransitionTo(LeadStatus.previewEnviado())).toBe(false);
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.proposta())).toBe(false);
    expect(LeadStatus.fechado().canTransitionTo(LeadStatus.fechado())).toBe(false);
    expect(LeadStatus.perdido().canTransitionTo(LeadStatus.perdido())).toBe(false);
  });

  it('equals should compare by value', () => {
    expect(LeadStatus.novo().equals(LeadStatus.novo())).toBe(true);
    expect(LeadStatus.novo().equals(LeadStatus.contatado())).toBe(false);
  });
});

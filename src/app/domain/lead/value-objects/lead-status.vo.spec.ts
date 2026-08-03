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

  it('canTransitionTo: novo → perdido is allowed', () => {
    expect(LeadStatus.novo().canTransitionTo(LeadStatus.perdido())).toBe(true);
  });

  it('canTransitionTo: contatado → fechado is allowed', () => {
    expect(LeadStatus.contatado().canTransitionTo(LeadStatus.fechado())).toBe(true);
  });

  it('canTransitionTo: proposta → respondeu is allowed as a rollback', () => {
    expect(LeadStatus.proposta().canTransitionTo(LeadStatus.respondeu())).toBe(true);
  });

  it('canTransitionTo: every pair of distinct valid statuses is allowed', () => {
    const statuses = [
      LeadStatus.novo(),
      LeadStatus.contatado(),
      LeadStatus.respondeu(),
      LeadStatus.previewEnviado(),
      LeadStatus.proposta(),
      LeadStatus.fechado(),
      LeadStatus.perdido(),
    ];

    for (const source of statuses) {
      for (const target of statuses) {
        expect(source.canTransitionTo(target)).toBe(!source.equals(target));
      }
    }
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

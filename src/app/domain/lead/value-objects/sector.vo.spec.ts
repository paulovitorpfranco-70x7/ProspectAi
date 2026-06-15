import { SectorInvalidError } from '@domain/lead/errors/sector-invalid.error';
import { Sector, type SectorValue } from './sector.vo';

describe('Sector', () => {
  it('should accept each of the 22 canonical sector values', () => {
    for (const value of Sector.ALL) {
      const sector = Sector.create(value);

      expect(sector.getValue()).toBe(value);
    }
  });

  it('should throw SectorInvalidError for unknown sector', () => {
    expect(() => Sector.create('Tecnologia')).toThrow(SectorInvalidError);
    expect(() => Sector.create('Tecnologia')).toThrow(
      'Setor "Tecnologia" não está na lista canônica.',
    );
  });

  it('should expose ALL as readonly array with 22 items', () => {
    const expected: readonly SectorValue[] = [
      'Clínicas & Consultórios',
      'Clínicas de Estética',
      'Clínicas Veterinárias & Pet',
      'Psicólogos & Terapeutas',
      'Fisioterapia & Pilates',
      'Odontologia',
      'Salões & Barbearias',
      'Salões Femininos',
      'Nail Designers',
      'Estúdios de Tatuagem',
      'Restaurantes',
      'Lanchonetes & Hamburguerias',
      'Padarias & Confeitarias',
      'Marmitarias & Delivery',
      'Oficinas Mecânicas',
      'Academias & Estúdios',
      'Fotógrafos & Estúdios',
      'Serviços Domésticos',
      'Advocacia',
      'Contabilidade',
      'Escolas & Cursos',
      'Igrejas & Ministérios',
    ];

    expect(Sector.ALL).toHaveLength(22);
    expect(Sector.ALL).toEqual(expected);
  });

  it('equals should compare by value', () => {
    const first = Sector.create('Restaurantes');
    const same = Sector.create('Restaurantes');
    const different = Sector.create('Advocacia');

    expect(first.equals(same)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});

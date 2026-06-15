import { SectorInvalidError } from '@domain/lead/errors/sector-invalid.error';

export type SectorValue =
  | 'Clínicas & Consultórios'
  | 'Clínicas de Estética'
  | 'Clínicas Veterinárias & Pet'
  | 'Psicólogos & Terapeutas'
  | 'Fisioterapia & Pilates'
  | 'Odontologia'
  | 'Salões & Barbearias'
  | 'Salões Femininos'
  | 'Nail Designers'
  | 'Estúdios de Tatuagem'
  | 'Restaurantes'
  | 'Lanchonetes & Hamburguerias'
  | 'Padarias & Confeitarias'
  | 'Marmitarias & Delivery'
  | 'Oficinas Mecânicas'
  | 'Academias & Estúdios'
  | 'Fotógrafos & Estúdios'
  | 'Serviços Domésticos'
  | 'Advocacia'
  | 'Contabilidade'
  | 'Escolas & Cursos'
  | 'Igrejas & Ministérios';

export class Sector {
  static readonly ALL: readonly SectorValue[] = [
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

  private constructor(private readonly value: SectorValue) {}

  static create(value: string): Sector {
    if (!Sector.isSectorValue(value)) {
      throw new SectorInvalidError(value);
    }

    return new Sector(value);
  }

  getValue(): SectorValue {
    return this.value;
  }

  equals(other: Sector): boolean {
    return this.value === other.value;
  }

  private static isSectorValue(value: string): value is SectorValue {
    return Sector.ALL.includes(value as SectorValue);
  }
}

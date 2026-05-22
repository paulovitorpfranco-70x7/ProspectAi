import { SectorInvalidError } from '@domain/lead/errors/sector-invalid.error';

export type SectorValue =
  | 'Clínicas & Consultórios'
  | 'Salões & Barbearias'
  | 'Oficinas Mecânicas'
  | 'Restaurantes'
  | 'Advocacia'
  | 'Contabilidade'
  | 'Academias & Estúdios'
  | 'Serviços Domésticos'
  | 'Igrejas & Ministérios'
  | 'Escolas & Cursos';

export class Sector {
  static readonly ALL: readonly SectorValue[] = [
    'Clínicas & Consultórios',
    'Salões & Barbearias',
    'Oficinas Mecânicas',
    'Restaurantes',
    'Advocacia',
    'Contabilidade',
    'Academias & Estúdios',
    'Serviços Domésticos',
    'Igrejas & Ministérios',
    'Escolas & Cursos',
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

import type { Sector } from '../value-objects/sector.vo';
import type { WebsiteQuality } from '../value-objects/website-quality.type';

export interface PlaceFinderQuery {
  readonly sector: Sector;
  readonly city: string;
}

/**
 * Dados crus retornados pelo provider externo (Google Places via Edge Function).
 * Ainda NAO sao uma Lead: o use case valida, converte para VOs e checa duplicatas.
 */
export interface PlaceFinderResult {
  readonly googlePlaceId: string | null;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly rating: number | null;
  readonly reviewCount: number | null;
  readonly address: string | null;
  readonly bairro: string | null;
  readonly hasWebsite: boolean;
  readonly instagramHandle: string | null;
  readonly websiteQuality: WebsiteQuality;
  readonly openingHours: unknown | null;
  readonly topReviews: unknown | null;
}

export interface PlaceFinderService {
  /**
   * Lanca PlaceFinderUnavailableError em falha de rede/auth da Edge Function.
   * Retorna array vazio se a busca foi bem-sucedida mas nao trouxe resultados.
   */
  search(query: PlaceFinderQuery): Promise<readonly PlaceFinderResult[]>;
}

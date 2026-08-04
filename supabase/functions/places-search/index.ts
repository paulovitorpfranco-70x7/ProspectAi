import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { extractTopReviews, type GoogleReview, type TopReview } from './place-details.ts';
import { enrichWebsite, type WebsiteQuality } from './website-enrichment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PlacesSearchRequest {
  readonly sector: string;
  readonly city: string;
}

interface GooglePlace {
  readonly id?: string;
  readonly displayName?: { readonly text?: string };
  readonly nationalPhoneNumber?: string;
  readonly internationalPhoneNumber?: string;
  readonly rating?: number;
  readonly userRatingCount?: number;
  readonly formattedAddress?: string;
  readonly websiteUri?: string;
  readonly regularOpeningHours?: unknown;
  readonly reviews?: readonly GoogleReview[];
}

interface GooglePlacesResponse {
  readonly places?: readonly GooglePlace[];
}

interface PlaceFinderResponseDto {
  readonly googlePlaceId?: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly address: string | null;
  readonly hasWebsite: boolean;
  readonly instagramHandle: string | null;
  readonly websiteQuality: WebsiteQuality;
  readonly openingHours: unknown | null;
  readonly topReviews: readonly TopReview[] | null;
}

const BASE_PLACE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'places.websiteUri',
] as const;

// Campos de maior custo, isolados para permitir enriquecimento sob demanda no futuro.
const EXPENSIVE_ENRICHMENT_FIELD_MASK = ['places.regularOpeningHours', 'places.reviews'] as const;

const SEARCH_QUERY_BY_SECTOR: Readonly<Record<string, string>> = {
  'Clínicas & Consultórios': 'Clínicas & Consultórios',
  'Clínicas de Estética': 'clínica de estética',
  'Clínicas Veterinárias & Pet': 'clínica veterinária pet shop',
  'Psicólogos & Terapeutas': 'psicólogo consultório',
  'Fisioterapia & Pilates': 'fisioterapia pilates',
  Odontologia: 'clínica odontológica dentista',
  'Salões & Barbearias': 'Salões & Barbearias',
  'Salões Femininos': 'salão de beleza feminino',
  'Nail Designers': 'nail designer manicure',
  'Estúdios de Tatuagem': 'estúdio de tatuagem',
  Restaurantes: 'Restaurantes',
  'Lanchonetes & Hamburguerias': 'lanchonete hamburgueria',
  'Padarias & Confeitarias': 'padaria confeitaria',
  'Marmitarias & Delivery': 'marmitaria delivery comida',
  'Oficinas Mecânicas': 'Oficinas Mecânicas',
  'Academias & Estúdios': 'Academias & Estúdios',
  'Fotógrafos & Estúdios': 'fotógrafo estúdio fotografia',
  'Serviços Domésticos': 'Serviços Domésticos',
  Advocacia: 'Advocacia',
  Contabilidade: 'Contabilidade',
  'Escolas & Cursos': 'Escolas & Cursos',
  'Igrejas & Ministérios': 'Igrejas & Ministérios',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  // Em dev local, o Supabase/Kong já valida a autorização quando verify_jwt=true.
  // Esta função não revalida o JWT para evitar rejeitar headers válidos do client.
  void authHeader;

  const { sector, city } = (await req.json()) as PlacesSearchRequest;
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';

  if (apiKey.length === 0) {
    return json({ error: 'GOOGLE_PLACES_API_KEY is not configured' }, 500);
  }

  const googleResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [...BASE_PLACE_FIELD_MASK, ...EXPENSIVE_ENRICHMENT_FIELD_MASK].join(','),
    },
    body: JSON.stringify({
      textQuery: `${SEARCH_QUERY_BY_SECTOR[sector] ?? sector} ${city}`,
      languageCode: 'pt-BR',
    }),
  });

  if (!googleResponse.ok) {
    const body = await googleResponse.text();
    return json({ error: 'Google Places request failed', details: body }, googleResponse.status);
  }

  const payload = (await googleResponse.json()) as GooglePlacesResponse;
  const results: PlaceFinderResponseDto[] = await Promise.all(
    (payload.places ?? []).map(async (place) => {
      const website = await enrichWebsite(place.websiteUri);

      return {
        ...(place.id ? { googlePlaceId: place.id } : {}),
        name: place.displayName?.text ?? '',
        phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
        email: null,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? 0,
        address: place.formattedAddress ?? null,
        hasWebsite: website.hasWebsite,
        instagramHandle: website.instagramHandle,
        websiteQuality: website.websiteQuality,
        openingHours: place.regularOpeningHours ?? null,
        topReviews: extractTopReviews(place.reviews),
      };
    }),
  );

  return json(results, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

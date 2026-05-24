import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
  readonly displayName?: { readonly text?: string };
  readonly nationalPhoneNumber?: string;
  readonly internationalPhoneNumber?: string;
  readonly rating?: number;
  readonly formattedAddress?: string;
  readonly websiteUri?: string;
}

interface GooglePlacesResponse {
  readonly places?: readonly GooglePlace[];
}

interface PlaceFinderResponseDto {
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly rating: number | null;
  readonly address: string | null;
  readonly hasWebsite: boolean;
}

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
      'X-Goog-FieldMask': [
        'places.displayName',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.rating',
        'places.formattedAddress',
        'places.websiteUri',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: `${sector} ${city}`,
      languageCode: 'pt-BR',
    }),
  });

  if (!googleResponse.ok) {
    const body = await googleResponse.text();
    return json({ error: 'Google Places request failed', details: body }, googleResponse.status);
  }

  const payload = (await googleResponse.json()) as GooglePlacesResponse;
  const results: PlaceFinderResponseDto[] = (payload.places ?? []).map((place) => ({
    name: place.displayName?.text ?? '',
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    email: null,
    rating: place.rating ?? null,
    address: place.formattedAddress ?? null,
    hasWebsite: place.websiteUri !== undefined,
  }));

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

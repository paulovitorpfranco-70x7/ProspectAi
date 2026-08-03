import {
  classifyWebsiteQuality,
  enrichWebsite,
  extractInstagramHandle,
  WEBSITE_FETCH_TIMEOUT_MS,
} from './website-enrichment.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

Deno.test('uses a five-second HTML fetch timeout by default', () => {
  assertEquals(WEBSITE_FETCH_TIMEOUT_MS, 5_000);
});

Deno.test('classifies missing, aggregator, weak and proper websites', () => {
  assertEquals(classifyWebsiteQuality(''), 'none');
  assertEquals(classifyWebsiteQuality('linktr.ee'), 'none');
  assertEquals(classifyWebsiteQuality('profile.bio.link'), 'none');
  assertEquals(classifyWebsiteQuality('barbearia.taplink.cc'), 'none');
  assertEquals(classifyWebsiteQuality('barbearia.wixsite.com'), 'weak');
  assertEquals(classifyWebsiteQuality('barbearia.negocio.site'), 'weak');
  assertEquals(classifyWebsiteQuality('barbearia.business.site'), 'weak');
  assertEquals(classifyWebsiteQuality('barbearia.webnode.com.br'), 'weak');
  assertEquals(classifyWebsiteQuality('barbearia.wordpress.com'), 'weak');
  assertEquals(classifyWebsiteQuality('barbearia.blogspot.com'), 'weak');
  assertEquals(classifyWebsiteQuality('barbeariamarica.com.br'), 'proper');
});

Deno.test('extracts a direct Instagram handle and removes at-sign', async () => {
  const fetcher = (() => {
    throw new Error('fetch must not run for Instagram');
  }) as typeof fetch;

  const enrichment = await enrichWebsite(
    'https://www.instagram.com/@Barbearia.Marica/?utm_source=google',
    fetcher,
  );

  assertEquals(enrichment, {
    instagramHandle: 'Barbearia.Marica',
    hasWebsite: false,
    websiteQuality: 'none',
  });
});

Deno.test('does not fetch HTML from blocked social domains', async () => {
  let fetchCalls = 0;
  const fetcher = (() => {
    fetchCalls += 1;
    throw new Error('unexpected fetch');
  }) as typeof fetch;

  const facebook = await enrichWebsite('https://facebook.com/barbearia', fetcher);
  const whatsapp = await enrichWebsite('https://wa.me/5521999990001', fetcher);

  assertEquals(fetchCalls, 0);
  assertEquals(facebook.websiteQuality, 'none');
  assertEquals(whatsapp.websiteQuality, 'none');
});

Deno.test('extracts the first non-generic Instagram handle from website HTML', async () => {
  const fetcher = (() =>
    Promise.resolve(
      new Response(
        '<a href="https://instagram.com/reels/1">Reel</a>' +
          '<a href="https://instagram.com/barbearia_marica">Instagram</a>',
      ),
    )) as typeof fetch;

  const enrichment = await enrichWebsite('https://barbeariamarica.com.br', fetcher);

  assertEquals(enrichment, {
    instagramHandle: 'barbearia_marica',
    hasWebsite: true,
    websiteQuality: 'proper',
  });
});

Deno.test('keeps aggregator as no website while allowing Instagram discovery', async () => {
  const fetcher = (() =>
    Promise.resolve(
      new Response('<a href="https://instagram.com/barbearia_marica">Perfil</a>'),
    )) as typeof fetch;

  const enrichment = await enrichWebsite('https://linktr.ee/barbearia', fetcher);

  assertEquals(enrichment, {
    instagramHandle: 'barbearia_marica',
    hasWebsite: false,
    websiteQuality: 'none',
  });
});

Deno.test('isolates HTML fetch errors', async () => {
  const fetcher = (() => Promise.reject(new TypeError('network failure'))) as typeof fetch;

  const enrichment = await enrichWebsite('https://barbeariamarica.com.br', fetcher);

  assertEquals(enrichment.instagramHandle, null);
  assertEquals(enrichment.websiteQuality, 'proper');
});

Deno.test('isolates HTML fetch timeouts', async () => {
  const fetcher = ((_input: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('Aborted', 'AbortError')),
      );
    })) as typeof fetch;

  const enrichment = await enrichWebsite('https://barbeariamarica.com.br', fetcher, 1);

  assertEquals(enrichment.instagramHandle, null);
  assertEquals(enrichment.websiteQuality, 'proper');
});

Deno.test('extractInstagramHandle rejects generic paths case-insensitively', () => {
  assertEquals(extractInstagramHandle('https://instagram.com/Stories/example'), null);
});

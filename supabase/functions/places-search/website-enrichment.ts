export type WebsiteQuality = 'proper' | 'weak' | 'none';

export interface WebsiteEnrichment {
  readonly instagramHandle: string | null;
  readonly hasWebsite: boolean;
  readonly websiteQuality: WebsiteQuality;
}

export const WEBSITE_QUALITY_DOMAINS = {
  socialOrAggregator: [
    'instagram.com',
    'facebook.com',
    'wa.me',
    'linktr.ee',
    'bio.link',
    'beacons.ai',
    'taplink',
  ],
  weakSubdomainSuffixes: ['wixsite.com', 'negocio.site', 'business.site', 'wordpress.com'],
  weakSubdomainLabels: ['webnode', 'blogspot'],
  socialOrAggregatorLabels: ['taplink'],
} as const;

const HTML_FETCH_BLOCKED_DOMAINS = ['instagram.com', 'facebook.com', 'wa.me'] as const;
const GENERIC_INSTAGRAM_HANDLES = new Set([
  'p',
  'reel',
  'reels',
  'explore',
  'accounts',
  'sharer',
  'stories',
  'tv',
  'direct',
]);
const INSTAGRAM_URL_PATTERN = /instagram\.com\/@?([A-Za-z0-9_.]+)/gi;
export const WEBSITE_FETCH_TIMEOUT_MS = 5_000;

export async function enrichWebsite(
  websiteUri: string | undefined,
  fetcher: typeof fetch = fetch,
  timeoutMs: number = WEBSITE_FETCH_TIMEOUT_MS,
): Promise<WebsiteEnrichment> {
  if (websiteUri === undefined || websiteUri.trim().length === 0) {
    return { instagramHandle: null, hasWebsite: false, websiteQuality: 'none' };
  }

  const hostname = getHostname(websiteUri);
  const websiteQuality = classifyWebsiteQuality(hostname);
  let instagramHandle: string | null = null;

  if (isDomain(hostname, 'instagram.com')) {
    instagramHandle = extractInstagramHandle(websiteUri);
  } else if (!HTML_FETCH_BLOCKED_DOMAINS.some((domain) => isDomain(hostname, domain))) {
    instagramHandle = await findInstagramHandleInWebsite(websiteUri, fetcher, timeoutMs);
  }

  return {
    instagramHandle,
    hasWebsite: websiteQuality !== 'none',
    websiteQuality,
  };
}

export function classifyWebsiteQuality(hostname: string): WebsiteQuality {
  if (
    hostname.length === 0 ||
    WEBSITE_QUALITY_DOMAINS.socialOrAggregator.some((domain) => isDomain(hostname, domain)) ||
    WEBSITE_QUALITY_DOMAINS.socialOrAggregatorLabels.some((label) =>
      hostname.split('.').includes(label),
    )
  ) {
    return 'none';
  }

  if (
    WEBSITE_QUALITY_DOMAINS.weakSubdomainSuffixes.some(
      (domain) => hostname !== domain && hostname.endsWith(`.${domain}`),
    ) ||
    WEBSITE_QUALITY_DOMAINS.weakSubdomainLabels.some((label) => hasSubdomainLabel(hostname, label))
  ) {
    return 'weak';
  }

  return 'proper';
}

export function extractInstagramHandle(content: string): string | null {
  INSTAGRAM_URL_PATTERN.lastIndex = 0;

  for (const match of content.matchAll(INSTAGRAM_URL_PATTERN)) {
    const handle = sanitizeInstagramHandle(match[1]);

    if (handle !== null) {
      return handle;
    }
  }

  return null;
}

async function findInstagramHandleInWebsite(
  websiteUri: string,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(websiteUri, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    return extractInstagramHandle(await response.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sanitizeInstagramHandle(value: string | undefined): string | null {
  const handle = value?.replace(/^@+/, '') ?? '';

  if (
    handle.length === 0 ||
    !/^[A-Za-z0-9_.]+$/.test(handle) ||
    GENERIC_INSTAGRAM_HANDLES.has(handle.toLowerCase())
  ) {
    return null;
  }

  return handle;
}

function getHostname(websiteUri: string): string {
  try {
    return new URL(websiteUri).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}

function isDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function hasSubdomainLabel(hostname: string, label: string): boolean {
  const labels = hostname.split('.');
  const labelIndex = labels.indexOf(label);

  return labelIndex > 0 && labelIndex < labels.length - 1;
}

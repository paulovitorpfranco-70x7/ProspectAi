export type WebsiteQuality = 'proper' | 'weak' | 'none';

export function isWebsiteQuality(value: string): value is WebsiteQuality {
  return value === 'proper' || value === 'weak' || value === 'none';
}

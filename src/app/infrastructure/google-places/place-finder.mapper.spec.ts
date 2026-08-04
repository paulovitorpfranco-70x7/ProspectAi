import { PlaceFinderMapper } from './place-finder.mapper';

describe('PlaceFinderMapper', () => {
  it('should map Edge Function response to PlaceFinderResult', () => {
    const [result] = PlaceFinderMapper.toResults([
      {
        googlePlaceId: 'ChIJAcme123',
        name: 'Acme Clinic',
        phone: '(21) 99999-0001',
        email: 'contato@acme.com',
        rating: 4.5,
        reviewCount: 30,
        address: 'Rua A, 123',
        hasWebsite: true,
        instagramHandle: 'acmeclinic',
        websiteQuality: 'proper',
      },
    ]);

    expect(result).toEqual({
      googlePlaceId: 'ChIJAcme123',
      name: 'Acme Clinic',
      phone: '(21) 99999-0001',
      email: 'contato@acme.com',
      rating: 4.5,
      reviewCount: 30,
      address: 'Rua A, 123',
      hasWebsite: true,
      instagramHandle: 'acmeclinic',
      websiteQuality: 'proper',
    });
  });

  it('should default rating to null', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.rating).toBeNull();
  });

  it('should default googlePlaceId to null for legacy responses', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.googlePlaceId).toBeNull();
  });

  it('should default reviewCount to zero', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.reviewCount).toBe(0);
  });

  it('should default address to null', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.address).toBeNull();
  });

  it('should default hasWebsite to false', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.hasWebsite).toBe(false);
  });

  it('should preserve legacy behavior when websiteQuality is absent', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic', hasWebsite: true });

    expect(result.hasWebsite).toBe(true);
    expect(result.websiteQuality).toBe('proper');
    expect(result.instagramHandle).toBeNull();
  });

  it('should derive hasWebsite from websiteQuality when enrichment is present', () => {
    const result = PlaceFinderMapper.toResult({
      name: 'Acme Clinic',
      hasWebsite: true,
      websiteQuality: 'none',
      instagramHandle: 'acmeclinic',
    });

    expect(result.hasWebsite).toBe(false);
    expect(result.websiteQuality).toBe('none');
    expect(result.instagramHandle).toBe('acmeclinic');
  });
});

import { PlaceFinderMapper } from './place-finder.mapper';

 describe('PlaceFinderMapper', () => {
  it('should map Edge Function response to PlaceFinderResult', () => {
    const [result] = PlaceFinderMapper.toResults([
      {
        name: 'Acme Clinic',
        phone: '(21) 99999-0001',
        email: 'contato@acme.com',
        rating: 4.5,
        address: 'Rua A, 123',
        hasWebsite: true,
      },
    ]);

    expect(result).toEqual({
      name: 'Acme Clinic',
      phone: '(21) 99999-0001',
      email: 'contato@acme.com',
      rating: 4.5,
      address: 'Rua A, 123',
      hasWebsite: true,
    });
  });

  it('should default rating to null', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.rating).toBeNull();
  });

  it('should default address to null', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.address).toBeNull();
  });

  it('should default hasWebsite to false', () => {
    const result = PlaceFinderMapper.toResult({ name: 'Acme Clinic' });

    expect(result.hasWebsite).toBe(false);
  });
});

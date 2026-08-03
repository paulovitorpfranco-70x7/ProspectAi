import { calculateLeadScore } from './calculate-lead-score';

describe('calculateLeadScore', () => {
  it('should return 100 for an ideal prospect and respect the score cap', () => {
    expect(
      calculateLeadScore({
        websiteQuality: 'none',
        instagramHandle: 'barbearia_marica',
        hasPhone: true,
        rating: 4.5,
        reviewCount: 30,
      }),
    ).toBe(100);
  });

  it('should return zero when no scoring rule matches', () => {
    expect(
      calculateLeadScore({
        websiteQuality: 'proper',
        instagramHandle: null,
        hasPhone: false,
        rating: 3.9,
        reviewCount: 19,
      }),
    ).toBe(0);
  });

  it('should score no website higher than a weak website', () => {
    const baseInput = {
      instagramHandle: null,
      hasPhone: false,
      rating: null,
      reviewCount: 0,
    } as const;

    expect(calculateLeadScore({ ...baseInput, websiteQuality: 'none' })).toBe(40);
    expect(calculateLeadScore({ ...baseInput, websiteQuality: 'weak' })).toBe(25);
  });

  it('should ignore an empty Instagram handle', () => {
    expect(
      calculateLeadScore({
        websiteQuality: 'proper',
        instagramHandle: '   ',
        hasPhone: false,
        rating: null,
        reviewCount: 0,
      }),
    ).toBe(0);
  });
});

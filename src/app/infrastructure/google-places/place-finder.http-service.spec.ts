import type { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PlaceFinderUnavailableError } from '@domain/lead/errors/place-finder-unavailable.error';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { EDGE_FUNCTIONS_URL } from '../config/environment.config';
import { PlaceFinderHttpService } from './place-finder.http-service';

function makeHttpClientMock(): jest.Mocked<Pick<HttpClient, 'post'>> {
  return {
    post: jest.fn(),
  };
}

describe('PlaceFinderHttpService', () => {
  it('should POST to Edge Function URL with sector and city', async () => {
    const http = makeHttpClientMock();
    http.post.mockReturnValueOnce(of([]));
    const service = new PlaceFinderHttpService(http as unknown as HttpClient);

    await service.search({ sector: Sector.create('Clínicas & Consultórios'), city: 'Niterói' });

    expect(http.post).toHaveBeenCalledWith(`${EDGE_FUNCTIONS_URL}/places-search`, {
      sector: 'Clínicas & Consultórios',
      city: 'Niterói',
    });
  });

  it('should map Edge Function response via mapper', async () => {
    const http = makeHttpClientMock();
    http.post.mockReturnValueOnce(
      of([
        {
          name: 'Acme Clinic',
          phone: '(21) 99999-0001',
          rating: null,
          address: null,
          hasWebsite: false,
        },
      ]),
    );
    const service = new PlaceFinderHttpService(http as unknown as HttpClient);

    const result = await service.search({
      sector: Sector.create('Clínicas & Consultórios'),
      city: 'Niterói',
    });

    expect(result).toEqual([
      {
        name: 'Acme Clinic',
        phone: '(21) 99999-0001',
        email: null,
        rating: null,
        address: null,
        hasWebsite: false,
      },
    ]);
  });

  it('should throw PlaceFinderUnavailableError on HTTP error', async () => {
    const http = makeHttpClientMock();
    http.post.mockReturnValueOnce(throwError(() => new Error('500 Internal Server Error')));
    const service = new PlaceFinderHttpService(http as unknown as HttpClient);

    await expect(
      service.search({ sector: Sector.create('Clínicas & Consultórios'), city: 'Niterói' }),
    ).rejects.toBeInstanceOf(PlaceFinderUnavailableError);
  });

  it('should throw PlaceFinderUnavailableError on network error', async () => {
    const http = makeHttpClientMock();
    http.post.mockReturnValueOnce(throwError(() => new TypeError('Failed to fetch')));
    const service = new PlaceFinderHttpService(http as unknown as HttpClient);

    await expect(
      service.search({ sector: Sector.create('Clínicas & Consultórios'), city: 'Niterói' }),
    ).rejects.toBeInstanceOf(PlaceFinderUnavailableError);
  });

  it('should return empty array when Edge Function returns empty results', async () => {
    const http = makeHttpClientMock();
    http.post.mockReturnValueOnce(of([]));
    const service = new PlaceFinderHttpService(http as unknown as HttpClient);

    const result = await service.search({
      sector: Sector.create('Clínicas & Consultórios'),
      city: 'Niterói',
    });

    expect(result).toEqual([]);
  });
});

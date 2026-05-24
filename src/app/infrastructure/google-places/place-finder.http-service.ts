import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PlaceFinderUnavailableError } from '@domain/lead/errors/place-finder-unavailable.error';
import type {
  PlaceFinderQuery,
  PlaceFinderResult,
  PlaceFinderService,
} from '@domain/lead/services/place-finder.service';
import { EDGE_FUNCTIONS_URL } from '../config/environment.config';
import { PlaceFinderMapper } from './place-finder.mapper';
import type { PlaceFinderResponseDto } from './place-finder.response.dto';

@Injectable({ providedIn: 'root' })
export class PlaceFinderHttpService implements PlaceFinderService {
  private readonly http = inject(HttpClient);

  async search(query: PlaceFinderQuery): Promise<readonly PlaceFinderResult[]> {
    try {
      const response = await firstValueFrom(
        this.http.post<readonly PlaceFinderResponseDto[]>(`${EDGE_FUNCTIONS_URL}/places-search`, {
          sector: query.sector.getValue(),
          city: query.city,
        }),
      );

      return PlaceFinderMapper.toResults(response);
    } catch (error) {
      throw new PlaceFinderUnavailableError(this.describeError(error));
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

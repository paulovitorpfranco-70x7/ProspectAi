import { InjectionToken } from '@angular/core';
import type { PlaceFinderService } from '@domain/lead/services/place-finder.service';

export const PLACE_FINDER = new InjectionToken<PlaceFinderService>('PLACE_FINDER');

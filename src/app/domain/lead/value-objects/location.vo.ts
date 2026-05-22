import { LocationInvalidError } from '@domain/lead/errors/location-invalid.error';

export interface LocationInput {
  readonly city: string;
  readonly address?: string | null;
}

const MIN_CITY_LENGTH = 2;
const MAX_CITY_LENGTH = 80;
const MAX_ADDRESS_LENGTH = 200;

export class Location {
  private constructor(
    private readonly cityValue: string,
    private readonly addressValue: string | null,
  ) {}

  static create(input: LocationInput): Location {
    const city = input.city.trim();
    const address = input.address?.trim() ?? null;

    if (city.length === 0) {
      throw new LocationInvalidError('CITY', 'cidade obrigatória');
    }

    if (city.length < MIN_CITY_LENGTH) {
      throw new LocationInvalidError('CITY', 'muito curto');
    }

    if (city.length > MAX_CITY_LENGTH) {
      throw new LocationInvalidError('CITY', 'muito longo');
    }

    if (address !== null && address.length > MAX_ADDRESS_LENGTH) {
      throw new LocationInvalidError('ADDRESS', 'muito longo');
    }

    return new Location(city, address);
  }

  getCity(): string {
    return this.cityValue;
  }

  getAddress(): string | null {
    return this.addressValue;
  }

  getCityNormalized(): string {
    return this.cityValue.trim().toLowerCase();
  }

  equals(other: Location): boolean {
    return this.cityValue === other.cityValue && this.addressValue === other.addressValue;
  }
}

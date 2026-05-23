export interface PlaceFinderResponseDto {
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly rating?: number | null;
  readonly address?: string | null;
  readonly hasWebsite?: boolean | null;
}

export interface CreateLeadInput {
  readonly businessName: string;
  readonly sector: string;
  readonly city: string;
  readonly address?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly rating?: number | null;
  readonly hasWebsite?: boolean;
}

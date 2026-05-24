import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { CreateLeadUseCase } from '@application/lead';
import { DuplicateLeadError } from '@domain/lead/errors/duplicate-lead.error';

export interface AddLeadFormState {
  readonly name: string;
  readonly sector: string;
  readonly city: string;
  readonly phone: string;
  readonly email: string;
}

export interface AddLeadState {
  readonly form: AddLeadFormState;
  readonly loading: boolean;
  readonly error: string | null;
  readonly success: boolean;
}

const emptyForm: AddLeadFormState = {
  name: '',
  sector: '',
  city: '',
  phone: '',
  email: '',
};

const initialState: AddLeadState = {
  form: emptyForm,
  loading: false,
  error: null,
  success: false,
};

export const AddLeadStore = signalStore(
  withState(initialState),
  withMethods((store, createLeadUseCase = inject(CreateLeadUseCase)) => ({
    updateField(field: keyof AddLeadFormState, value: string): void {
      patchState(store, {
        form: {
          ...store.form(),
          [field]: value,
        },
        success: false,
      });
    },

    async submit(): Promise<void> {
      const form = store.form();
      patchState(store, { loading: true, error: null, success: false });

      try {
        await createLeadUseCase.execute({
          businessName: form.name,
          sector: form.sector,
          city: form.city,
          phone: toOptionalString(form.phone),
          email: toOptionalString(form.email),
          hasWebsite: false,
        });

        patchState(store, {
          form: emptyForm,
          loading: false,
          error: null,
          success: true,
        });
      } catch (error) {
        patchState(store, {
          loading: false,
          error: getSubmitErrorMessage(error),
          success: false,
        });
      }
    },

    resetSuccess(): void {
      patchState(store, { success: false });
    },
  })),
);

function toOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function getSubmitErrorMessage(error: unknown): string {
  if (error instanceof DuplicateLeadError) {
    return 'Já existe um lead com este telefone nesta cidade.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro ao adicionar lead.';
}

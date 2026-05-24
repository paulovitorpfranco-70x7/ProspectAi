import { TestBed } from '@angular/core/testing';
import { CreateLeadUseCase, type CreateLeadOutput } from '@application/lead';
import { DuplicateLeadError } from '@domain/lead/errors/duplicate-lead.error';
import { AddLeadStore } from './add-lead.store';

function setup(execute = jest.fn<Promise<CreateLeadOutput>, Parameters<CreateLeadUseCase['execute']>>()) {
  TestBed.configureTestingModule({
    providers: [
      AddLeadStore,
      {
        provide: CreateLeadUseCase,
        useValue: { execute },
      },
    ],
  });

  return {
    store: TestBed.inject(AddLeadStore),
    execute,
  };
}

describe('AddLeadStore', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should add lead to pipeline state after create succeeds', async () => {
    const { store, execute } = setup(jest.fn().mockResolvedValue({ lead: {} }));
    store.updateField('name', 'Acme Clinic');
    store.updateField('sector', 'Clínicas & Consultórios');
    store.updateField('city', 'Niterói');
    store.updateField('phone', '(21) 99999-0001');

    await store.submit();

    expect(execute).toHaveBeenCalledWith({
      businessName: 'Acme Clinic',
      sector: 'Clínicas & Consultórios',
      city: 'Niterói',
      phone: '(21) 99999-0001',
      email: null,
      hasWebsite: false,
    });
    expect(store.success()).toBe(true);
    expect(store.error()).toBeNull();
    expect(store.form()).toEqual({ name: '', sector: '', city: '', phone: '', email: '' });
  });

  it('should show duplicate error when DuplicateLeadError thrown', async () => {
    const { store } = setup(jest.fn().mockRejectedValue(new DuplicateLeadError('21999990001', 'Niterói')));
    store.updateField('name', 'Acme Clinic');
    store.updateField('sector', 'Clínicas & Consultórios');
    store.updateField('city', 'Niterói');
    store.updateField('phone', '(21) 99999-0001');

    await store.submit();

    expect(store.success()).toBe(false);
    expect(store.error()).toBe('Já existe um lead com este telefone nesta cidade.');
  });
});

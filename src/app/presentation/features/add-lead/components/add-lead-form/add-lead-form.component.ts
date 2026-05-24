import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { ButtonComponent } from '@presentation/shared/components/button/button.component';
import { InputComponent } from '@presentation/shared/components/input/input.component';
import { SelectComponent, type SelectOption } from '@presentation/shared/components/select/select.component';
import type { AddLeadFormState } from '../../store/add-lead.store';

@Component({
  selector: 'app-add-lead-form',
  standalone: true,
  imports: [ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './add-lead-form.component.html',
  styleUrl: './add-lead-form.component.scss',
})
export class AddLeadFormComponent {
  @Input() form: AddLeadFormState = {
    name: '',
    sector: '',
    city: '',
    phone: '',
    email: '',
  };
  @Input() loading = false;

  @Output() readonly fieldChanged = new EventEmitter<{
    field: keyof AddLeadFormState;
    value: string;
  }>();
  @Output() readonly submitted = new EventEmitter<void>();

  readonly sectorOptions: readonly SelectOption[] = [
    { value: '', label: 'Selecione um setor' },
    ...Sector.ALL.map((sector) => ({ value: sector, label: sector })),
  ];

  get hasContactChannel(): boolean {
    return this.form.phone.trim().length > 0 || this.form.email.trim().length > 0;
  }

  get canSubmit(): boolean {
    return !this.loading && this.form.sector.trim().length > 0 && this.hasContactChannel;
  }

  updateField(field: keyof AddLeadFormState, value: string): void {
    this.fieldChanged.emit({ field, value });
  }

  submit(): void {
    if (this.canSubmit) {
      this.submitted.emit();
    }
  }
}

import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AddLeadFormComponent } from '../components/add-lead-form/add-lead-form.component';
import { AddLeadStore, type AddLeadFormState } from '../store/add-lead.store';

@Component({
  selector: 'app-add-lead-page',
  standalone: true,
  imports: [AddLeadFormComponent],
  providers: [AddLeadStore],
  templateUrl: './add-lead.page.html',
  styleUrl: './add-lead.page.scss',
})
export class AddLeadPage {
  protected readonly store = inject(AddLeadStore);
  private readonly router = inject(Router);

  private readonly redirectOnSuccess = effect(() => {
    if (this.store.success()) {
      void this.router.navigateByUrl('/pipeline').then(() => this.store.resetSuccess());
    }
  });

  protected updateField(event: { field: keyof AddLeadFormState; value: string }): void {
    this.store.updateField(event.field, event.value);
  }
}

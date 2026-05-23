import { Component, OnInit, inject } from '@angular/core';
import type { LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';
import { EmptyStateComponent } from '@presentation/shared/components/empty-state/empty-state.component';
import { InputComponent } from '@presentation/shared/components/input/input.component';
import { SelectComponent, type SelectOption } from '@presentation/shared/components/select/select.component';
import { SpinnerComponent } from '@presentation/shared/components/spinner/spinner.component';
import { PipelineColumnComponent } from '../components/pipeline-column/pipeline-column.component';
import { PipelineStore, isLeadStatusValue, type PipelineFilterStatus } from '../store/pipeline.store';

const FILTER_OPTIONS: readonly SelectOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'novo', label: 'Novo' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'descartado', label: 'Descartado' },
];

const SORT_OPTIONS: readonly SelectOption[] = [
  { value: 'createdAt', label: 'Criação' },
  { value: 'rating', label: 'Avaliação' },
  { value: 'contactCount', label: 'Contatos' },
  { value: 'lastContactAt', label: 'Último contato' },
];

@Component({
  selector: 'app-pipeline-page',
  standalone: true,
  imports: [EmptyStateComponent, InputComponent, PipelineColumnComponent, SelectComponent, SpinnerComponent],
  providers: [PipelineStore],
  templateUrl: './pipeline.page.html',
  styleUrl: './pipeline.page.scss',
})
export class PipelinePage implements OnInit {
  protected readonly store = inject(PipelineStore);
  protected readonly filterOptions = FILTER_OPTIONS;
  protected readonly sortOptions = SORT_OPTIONS;

  ngOnInit(): void {
    void this.store.loadLeads();
  }

  protected onFilterChanged(value: string): void {
    if (value === 'all' || isLeadStatusValue(value)) {
      this.store.setFilter(value as PipelineFilterStatus);
    }
  }

  protected onSortChanged(value: string): void {
    this.store.setSortBy(value);
  }

  protected onStatusChange(event: { leadId: string; newStatus: LeadStatusValue }): void {
    void this.store.updateStatus(event.leadId, event.newStatus);
  }
}

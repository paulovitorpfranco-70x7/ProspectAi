import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { LeadDto } from '@application/lead';
import type { LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';
import { LeadCardComponent } from '../lead-card/lead-card.component';

@Component({
  selector: 'app-pipeline-column',
  standalone: true,
  imports: [LeadCardComponent],
  templateUrl: './pipeline-column.component.html',
  styleUrl: './pipeline-column.component.scss',
})
export class PipelineColumnComponent {
  @Input() leads: LeadDto[] = [];
  @Input() status = '';

  @Output() readonly statusChange = new EventEmitter<{ leadId: string; newStatus: LeadStatusValue }>();
  @Output() readonly whatsapp = new EventEmitter<string>();
  @Output() readonly email = new EventEmitter<string>();
  @Output() readonly remove = new EventEmitter<string>();
}

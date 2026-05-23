import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { LeadDto } from '@application/lead';
import { LeadStatus, type LeadStatusValue } from '@domain/lead/value-objects/lead-status.vo';
import { BadgeComponent, type BadgeColor } from '@presentation/shared/components/badge/badge.component';
import { ButtonComponent } from '@presentation/shared/components/button/button.component';
import { CardComponent } from '@presentation/shared/components/card/card.component';
import { STALE_THRESHOLD_DAYS } from '@presentation/shared/constants';
import { PhoneFormatPipe } from '@presentation/shared/pipes/phone-format.pipe';

const STATUS_VALUES: readonly LeadStatusValue[] = [
  'novo',
  'contatado',
  'proposta',
  'fechado',
  'descartado',
];

const STATUS_LABELS: Readonly<Record<LeadStatusValue, string>> = {
  novo: 'Novo',
  contatado: 'Contatado',
  proposta: 'Proposta',
  fechado: 'Fechado',
  descartado: 'Descartado',
};

const STATUS_COLORS: Readonly<Record<LeadStatusValue, BadgeColor>> = {
  novo: 'info',
  contatado: 'accent',
  proposta: 'warning',
  fechado: 'success',
  descartado: 'muted',
};

const SECTOR_ICONS: Readonly<Record<string, string>> = {
  'Clínicas & Consultórios': '🏥',
  'Salões & Barbearias': '✂️',
  'Oficinas Mecânicas': '🔧',
  Restaurantes: '🍽️',
  Advocacia: '⚖️',
  Contabilidade: '📊',
  'Academias & Estúdios': '💪',
  'Serviços Domésticos': '🧹',
  'Igrejas & Ministérios': '⛪',
  'Escolas & Cursos': '🎓',
};

@Component({
  selector: 'app-lead-card',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, CardComponent, PhoneFormatPipe],
  templateUrl: './lead-card.component.html',
  styleUrl: './lead-card.component.scss',
})
export class LeadCardComponent {
  @Input({ required: true }) lead!: LeadDto;

  @Output() readonly statusChange = new EventEmitter<{ leadId: string; newStatus: LeadStatusValue }>();
  @Output() readonly whatsapp = new EventEmitter<string>();
  @Output() readonly email = new EventEmitter<string>();
  @Output() readonly remove = new EventEmitter<string>();

  readonly statuses = STATUS_VALUES;

  get sectorIcon(): string {
    return SECTOR_ICONS[this.lead.sector] ?? '🎯';
  }

  get statusLabel(): string {
    return STATUS_LABELS[this.lead.status];
  }

  get statusColor(): BadgeColor {
    return STATUS_COLORS[this.lead.status];
  }

  get isStale(): boolean {
    if (this.lead.status !== 'contatado' || this.lead.lastContactAtIso === null) {
      return false;
    }

    const lastContactAt = new Date(this.lead.lastContactAtIso).getTime();
    const ageInDays = (Date.now() - lastContactAt) / (24 * 60 * 60 * 1000);

    return ageInDays >= STALE_THRESHOLD_DAYS;
  }

  statusButtonLabel(status: LeadStatusValue): string {
    return STATUS_LABELS[status];
  }

  canTransitionTo(status: LeadStatusValue): boolean {
    return LeadStatus.create(this.lead.status).canTransitionTo(LeadStatus.create(status));
  }

  requestStatusChange(status: LeadStatusValue): void {
    if (this.canTransitionTo(status)) {
      this.statusChange.emit({ leadId: this.lead.id, newStatus: status });
    }
  }
}

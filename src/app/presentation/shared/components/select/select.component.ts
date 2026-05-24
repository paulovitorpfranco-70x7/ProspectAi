import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
})
export class SelectComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() options: readonly SelectOption[] = [];
  @Output() readonly changed = new EventEmitter<string>();

  onChange(event: Event): void {
    this.changed.emit((event.target as HTMLSelectElement).value);
  }
}

import { Component, Input } from '@angular/core';

export type BadgeColor = 'success' | 'warning' | 'info' | 'accent' | 'danger' | 'muted';

@Component({
  selector: 'app-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  @Input() color: BadgeColor = 'info';
}

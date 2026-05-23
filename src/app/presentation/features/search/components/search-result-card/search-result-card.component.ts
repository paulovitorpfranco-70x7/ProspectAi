import { Component, Input } from '@angular/core';
import type { SearchLeadsResultItem } from '@application/lead';
import { BadgeComponent } from '@presentation/shared/components/badge/badge.component';
import { CardComponent } from '@presentation/shared/components/card/card.component';

@Component({
  selector: 'app-search-result-card',
  standalone: true,
  imports: [BadgeComponent, CardComponent],
  templateUrl: './search-result-card.component.html',
  styleUrl: './search-result-card.component.scss',
})
export class SearchResultCardComponent {
  @Input({ required: true }) item!: SearchLeadsResultItem;

  get statusLabel(): string {
    switch (this.item.itemStatus) {
      case 'added':
        return 'Adicionado';
      case 'skipped_duplicate':
        return 'Duplicado';
      case 'skipped_invalid':
        return 'Inválido';
      case 'skipped_has_website':
        return 'Já tem site';
    }
  }
}

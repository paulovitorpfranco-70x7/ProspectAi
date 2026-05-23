import { Component, inject } from '@angular/core';
import { EmptyStateComponent } from '@presentation/shared/components/empty-state/empty-state.component';
import { SpinnerComponent } from '@presentation/shared/components/spinner/spinner.component';
import { SearchFormComponent } from '../components/search-form/search-form.component';
import { SearchResultCardComponent } from '../components/search-result-card/search-result-card.component';
import { SearchStore } from '../store/search.store';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [EmptyStateComponent, SearchFormComponent, SearchResultCardComponent, SpinnerComponent],
  providers: [SearchStore],
  templateUrl: './search.page.html',
  styleUrl: './search.page.scss',
})
export class SearchPage {
  protected readonly store = inject(SearchStore);
}

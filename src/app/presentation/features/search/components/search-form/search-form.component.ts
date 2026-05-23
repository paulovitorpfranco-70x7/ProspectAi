import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { ButtonComponent } from '@presentation/shared/components/button/button.component';
import { InputComponent } from '@presentation/shared/components/input/input.component';
import { SECTOR_ICONS } from '../../constants/sector-icons';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [ButtonComponent, InputComponent],
  templateUrl: './search-form.component.html',
  styleUrl: './search-form.component.scss',
})
export class SearchFormComponent {
  @Input() selectedSector: string | null = null;
  @Input() city = '';
  @Input() loading = false;

  @Output() readonly sectorSelected = new EventEmitter<string>();
  @Output() readonly cityChanged = new EventEmitter<string>();
  @Output() readonly searchRequested = new EventEmitter<void>();

  readonly sectors = Sector.ALL;
  readonly sectorIcons = SECTOR_ICONS;

  selectSector(sector: string): void {
    this.sectorSelected.emit(sector);
  }

  changeCity(city: string): void {
    this.city = city;
    this.cityChanged.emit(city);
  }

  requestSearch(): void {
    this.searchRequested.emit();
  }
}

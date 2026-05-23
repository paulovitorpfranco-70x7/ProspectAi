import { Component, Input, model } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() error = '';
  @Input() type = 'text';

  readonly value = model<string>('');

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}

import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card p-2 bg-white flex items-center gap-2">
    <span>🔎</span>
    <input class="input !border-0 !p-2" placeholder="Rechercher..." (input)="onInput($event)">
  </div>
  `
})
export class SearchbarComponent {
  @Output() query = new EventEmitter<string>();
  onInput(e: Event) { this.query.emit((e.target as HTMLInputElement).value); }
}

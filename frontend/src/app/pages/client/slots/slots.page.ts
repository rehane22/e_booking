import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type Slot = { time: string; available: boolean };

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="px-5 py-5 space-y-4">
    <h1 class="text-lg font-semibold">Créneaux disponibles</h1>

    <div class="card p-4">
      <div class="grid grid-cols-3 gap-3">
        @for (s of slots; track s.time) {
          <button class="h-10 rounded-xl border text-sm"
                  [disabled]="!s.available"
                  (click)="selected=s.time">
            {{ s.time }}
          </button>
        } @empty {
          <div class="text-sm text-muted">Aucun créneau.</div>
        }
      </div>
    </div>

    @if (selected) {
      <div class="text-sm">Sélectionné: <b>{{ selected }}</b></div>
    }
  </div>
  `
})
export class SlotsPage {
  selected: string | null = null;
  slots: Slot[] = [
    { time:'10:00', available:true }, { time:'10:30', available:true }, { time:'11:00', available:false },
    { time:'11:30', available:true }, { time:'12:00', available:true }, { time:'12:30', available:true },
  ];
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="px-5 py-5 space-y-4">
    <h1 class="text-lg font-semibold">Prendre un rendez-vous</h1>
    <div class="card p-4">
      <p class="text-sm text-muted">Sélectionner date & créneau (brancher vos données).</p>
    </div>
    <button class="btn-primary w-full h-12">Confirmer</button>
  </div>
  `
})
export class RendezvousNouveauPage {}

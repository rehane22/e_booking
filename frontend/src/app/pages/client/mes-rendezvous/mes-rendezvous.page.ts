import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="px-6 py-6 space-y-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">Mes rendez-vous</h1>
      <a routerLink="/services" class="btn-primary h-9">Réserver</a>
    </div>

    <div class="space-y-3 mt-2">
      @for (r of rdvs; track r.id) {
        <div class="card p-4 flex items-center justify-between">
          <div>
            <p class="font-semibold">{{ r.titre }}</p>
            <p class="text-xs text-muted">{{ r.date }} · {{ r.horaire }}</p>
            <span class="badge mt-2">{{ r.statut }}</span>
          </div>
          <div class="flex gap-2">
            <button class="btn-ghost h-9">Annuler</button>
            <button class="btn-primary h-9">Replanifier</button>
          </div>
        </div>
      } @empty {
        <div class="text-sm text-muted">Aucun rendez-vous pour le moment.</div>
      }
    </div>
  </div>
  `
})
export class MesRendezvousPage {
  rdvs = [{ id:1, titre:'Manucure gel', date:'Demain', horaire:'14:00', statut:'Confirmé' }];
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';
import { RendezVousApi } from '../../../core/api/rendezvous.api';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true, imports: [CommonModule,RouterModule],
  template: `
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Espace Pro</h1>
    </div>

    @if (me) {
      <div class="card p-6">
        <div class="grid sm:grid-cols-2 gap-4">
          <p class="text-sm"><b>Spécialité:</b> {{ me.specialite || '—' }}</p>
          <p class="text-sm"><b>Adresse:</b> {{ me.adresse || '—' }}</p>
        </div>
      </div>
    }

    <div class="grid md:grid-cols-3 gap-6">
      <div class="card p-6">
        <h3 class="font-semibold">Aujourd’hui</h3>
        <p class="text-sm text-muted mt-1">{{ todayCount }} rendez-vous</p>
        <button routerLink="/pro/rendezvous" class="btn-ghost mt-3 h-10">Voir</button>
      </div>
      <div class="card p-6">
        <h3 class="font-semibold">Disponibilités</h3>
        <p class="text-sm text-muted mt-1">Mettez à jour vos créneaux</p>
        <button routerLink="/pro/disponibilites" class="btn-ghost mt-3 h-10">Gérer</button>
      </div>
      <div class="card p-6">
        <h3 class="font-semibold">Services</h3>
        <p class="text-sm text-muted mt-1">Reliez vos prestations au catalogue</p>
        <button routerLink="/pro/services" class="btn-primary mt-3 h-10">Configurer</button>
      </div>
    </div>
  </div>
  `
})
export class DashboardPage implements OnInit {
  private proApi = inject(PrestataireApi);
  private rdvApi = inject(RendezVousApi);

  me!: PrestataireMe;
  todayCount = 0;

  ngOnInit() {
    this.proApi.me().subscribe(me => {
      this.me = me;
      const today = new Date().toISOString().slice(0,10);
      this.rdvApi.listByPrestataire(me.id, today).subscribe(list => this.todayCount = list.length);
    });
  }
}

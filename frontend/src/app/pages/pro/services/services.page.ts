import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';
import { ServiceCatalogApi, ServiceItem } from '../../../core/api/service-catalog.api';

@Component({
  standalone: true,
  imports:[CommonModule, RouterModule],
  template: `
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- HEADER -->
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Mes services</h1>
      <button type="button" routerLink="/pro" class="btn-ghost h-10">← Dashboard</button>
    </div>

    <!-- CARTES HORIZONTALES -->
    <div class="grid md:grid-cols-2 gap-6">
      
      <!-- MES SERVICES LIÉS -->
      <div class="card p-5 space-y-3">
        <h3 class="font-semibold text-sm mb-2">Mes services liés</h3>

        @for (s of linked; track s.id) {
          <div class="flex items-center justify-between p-3 border rounded-xl">
            <span class="text-sm">{{ s.nom }}</span>
            <button class="btn-ghost h-8" (click)="unlink(s.id)">Retirer</button>
          </div>
        } @empty {
          <div class="text-sm text-muted">Vous n'avez lié aucun service.</div>
        }
      </div>

      <!-- CATALOGUE DES SERVICES (FILTRÉ) -->
      <div class="card p-5 space-y-3">
        <h3 class="font-semibold text-sm mb-2">Catalogue disponible</h3>

        @for (s of catalogueNonLies; track s.id) {
          <div class="flex items-center justify-between p-3 border rounded-xl">
            <span class="text-sm">{{ s.nom }}</span>
            <button class="btn-primary h-8" (click)="link(s.id)">Lier</button>
          </div>
        } @empty {
          <div class="text-sm text-muted">Tous les services sont déjà liés 🎉</div>
        }
      </div>

    </div>
  </div>
  `
})
export class ServicesPage implements OnInit {
  private proApi = inject(PrestataireApi);
  private catalogApi = inject(ServiceCatalogApi);

  me!: PrestataireMe;
  catalogue: ServiceItem[] = [];
  linked: ServiceItem[] = [];
  catalogueNonLies: ServiceItem[] = [];

  ngOnInit() { this.refresh(); }

  private refresh() {
    this.proApi.me().subscribe(me => {
      this.me = me;
      const linked = (me.services ?? []) as ServiceItem[];
      this.linked = linked;

      this.catalogApi.findAll().subscribe(all => {
        this.catalogue = all;

        // Filtrer ce qui n'est pas déjà lié
        const linkedIds = new Set(linked.map(s => s.id));
        this.catalogueNonLies = all.filter(s => !linkedIds.has(s.id));
      });
    });
  }

  link(serviceId: string|number) {
    this.proApi.linkService(this.me.id, serviceId).subscribe({
      next: () => this.refresh(),
      error: (e) => alert('Lien impossible: ' + (e.error?.message ?? e.status))
    });
  }

  unlink(serviceId: string|number) {
    if (!confirm('Retirer ce service ?')) return;
    this.proApi.unlinkService(this.me.id, serviceId).subscribe({
      next: () => this.refresh(),
      error: (e) => alert('Impossible de retirer: ' + (e.error?.message ?? e.status))
    });
  }
}

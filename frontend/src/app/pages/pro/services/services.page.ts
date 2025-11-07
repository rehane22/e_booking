import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';
import { ServiceCatalogApi, ServiceItem } from '../../../core/api/service-catalog.api';

@Component({
  standalone: true,
  imports:[CommonModule, RouterModule],
  templateUrl: './services.page.html',
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

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';


@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="px-6 py-6">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold capitalize">Prestataires · {{ serviceName }}</h1>
      <div class="flex gap-2">
        <button routerLink="/services" class="btn-ghost h-9">← Catalogue</button>
        <button routerLink="/mon-compte/rendezvous" class="btn-ghost h-9">Mes RDV</button>
      </div>
    </div>

    <div class="space-y-3 mt-4">
      @for (p of pros; track p.id) {
        <div class="card p-4 flex items-center gap-4">
          <img [src]="p.photo" class="h-14 w-14 rounded-xl object-cover" />
          <div class="flex-1">
            <p class="font-semibold">{{ p.name }}</p>
            <p class="text-xs text-muted">{{ p.speciality }}</p>
            <p class="text-xs text-muted">★ {{ p.rating }} · {{ p.city }}</p>
            <div class="mt-3 flex gap-2">
              <button class="btn-ghost h-9" [routerLink]="['/prestataires', p.id]">Profil</button>
              <button class="btn-primary h-9" routerLink="/rendezvous/nouveau">Prendre RDV</button>
            </div>
          </div>
        </div>
      } @empty {
        <div class="text-sm text-muted">Pas encore de prestataires pour cette catégorie.</div>
      }
    </div>
  </div>
  `
})
export class PrestatairesParServicePage implements OnInit {
  private route = inject(ActivatedRoute);
  serviceSlug!: string;
  serviceName = '';
  pros: any[] = [];

  private unslug = (slug: string) => slug.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');

  ngOnInit() {
    this.serviceSlug = this.route.snapshot.paramMap.get('serviceSlug') ?? '';
    this.serviceName = this.unslug(this.serviceSlug);
    // TODO: remplacer par appel GET /api/prestataires?serviceSlug=...
    this.pros = Array.from({length:6}).map((_,i)=>({
      id:String(i+1),
      name:`${this.serviceName} Pro #${i+1}`,
      speciality:this.serviceName,
      rating:4.8,
      city:'Paris',
      photo:`https://i.pravatar.cc/100?img=${10+i}`
    }));
  }
}

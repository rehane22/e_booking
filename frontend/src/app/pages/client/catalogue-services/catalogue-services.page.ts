import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceCatalogApi, ServiceItem } from '../../../core/api/service-catalog.api';
import { PrestataireApi } from '../../../core/api/prestataire.api';

type ProCard = {
  id: string|number;
  prenom: string;
  nom: string;
  nomAffiche: string;
  ville?: string;
  specialite?: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Catalogue</h1>
    </div>

    <div class="grid md:grid-cols-3 gap-6 mt-6">
      <!-- ===== Colonne gauche : FILTRES + SERVICES (scroll interne) ===== -->
      <aside class="md:col-span-1">
        <div class="card p-4 h-[calc(100vh-160px)] flex flex-col">
          <div class="space-y-3">
            <div>
              <label class="text-xs">Rechercher un service</label>
              <input class="input h-10" placeholder="Onglerie, Coiffure…"
                     [(ngModel)]="svcQuery" (ngModelChange)="filterServices()">
            </div>

            <div class="flex flex-wrap gap-2">
              @for (s of selectedServices(); track s.id) {
                <span class="badge">{{ s.nom }}</span>
              } @empty {
                <span class="text-xs text-muted">Aucune catégorie sélectionnée</span>
              }
            </div>

            <div class="flex gap-2">
              <button class="btn-ghost h-9" (click)="clearSelection()">Réinitialiser</button>
            </div>
          </div>

          <hr class="my-4 border-black/10">

          <div class="flex-1 overflow-auto pr-1">
            <div class="space-y-2">
              @for (s of servicesView; track s.id) {
                <label class="p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-rose-card"
                       [class.border-primary]="selected.has(s.id)">
                  <span class="text-sm">{{ s.nom }}</span>
                  <input type="checkbox"
                         class="h-4 w-4"
                         [checked]="selected.has(s.id)"
                         (change)="toggle(s.id, $event.target)">
                </label>
              } @empty {
                <div class="text-sm text-muted">Aucun service trouvé.</div>
              }
            </div>
          </div>
        </div>
      </aside>

      <!-- ===== Colonne droite : RÉSULTATS (scroll interne) ===== -->
      <section class="md:col-span-2">
        <div class="card p-4 h-[calc(100vh-160px)] flex flex-col">

          <div class="flex flex-wrap items-end gap-3">
            <div class="flex-1 min-w-[220px]">
              <label class="text-xs">Rechercher un prestataire</label>
              <input class="input h-10" placeholder="Nom, ville, spécialité…"
                     [(ngModel)]="proQuery" (ngModelChange)="resetPaging()">
            </div>
            <div class="ml-auto">
              <button class="btn-ghost h-10" (click)="clearAll()">Tout effacer</button>
            </div>
          </div>

          <hr class="my-4 border-black/10">

          <div class="flex-1 overflow-auto pr-1" #rightScroll>
            <div class="grid lg:grid-cols-2 gap-3">
              @for (p of visiblePros(); track p.id) {
                <div class="p-3 rounded-2xl border flex gap-3 items-center">
                  <!-- Avatar initiales -->
                  <div class="h-16 w-16 rounded-xl grid place-items-center text-white font-semibold"
                       [ngClass]="avatarBg(p.id)">
                    {{ initials(p.nomAffiche) }}
                  </div>

                  <div class="flex-1">
                    <p class="font-medium">{{ p.nomAffiche }}</p>
                    <p class="text-xs text-muted">
                      @if (p.specialite) { {{ p.specialite }} · }
                      @if (p.ville) { {{ p.ville }} }
                    </p>
                    <div class="mt-2">
                      <button class="btn-primary h-9"
                              [routerLink]="['/prestataires', p.id]"
                              [queryParams]="{ focus: 'slots' }">
                        Voir Profil
                      </button>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="text-sm text-muted p-4">
                  Aucun prestataire trouvé.
                </div>
              }
            </div>

            @if (canLoadMore()) {
              <div class="flex justify-center pt-4">
                <button class="btn-ghost h-10 px-6" (click)="loadMore()">Charger plus</button>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  </div>
  `
})
export class CatalogueServicesPage implements OnInit {
  private servicesApi = inject(ServiceCatalogApi);
  private proApi = inject(PrestataireApi);

  @ViewChild('rightScroll') rightScrollRef!: ElementRef<HTMLDivElement>;

  // Services (gauche)
  services: ServiceItem[] = [];
  servicesView: ServiceItem[] = [];
  selected = new Set<string|number>();
  svcQuery = '';

  // Prestataires (droite)
  prosAll: ProCard[] = [];
  proQuery = '';
  sortKey: 'nomAffiche' | 'ville' = 'nomAffiche';

  // Pagination interne (droite)
  pageSize = 10;
  page = 1;

  ngOnInit() {
    this.servicesApi.findAll().subscribe(list => {
      this.services = list;
      this.servicesView = [...list];
    });
    // ✅ Charger tous les prestataires au démarrage
    this.fetchAllPros();
  }

  /* ------------ Colonne gauche ------------ */
  filterServices() {
    const q = this.svcQuery.trim().toLowerCase();
    this.servicesView = !q
      ? [...this.services]
      : this.services.filter(s => s.nom.toLowerCase().includes(q));
  }

  toggle(id: string|number, el?: any) {
    const willCheck = el ? el.checked : !this.selected.has(id);
    if (willCheck) this.selected.add(id); else this.selected.delete(id);
    // ✅ Filtrage immédiat au clic
    this.fetchPros();
  }

  clearSelection() {
    this.selected.clear();
    this.fetchAllPros();
  }

  selectedArray(){ return Array.from(this.selected); }
  selectedServices() { return this.services.filter(s => this.selected.has(s.id)); }

  /* ------------ Colonne droite ------------ */
  private mapToProCards(list: any[]): ProCard[] {
    return list.map((p: any) => ({
      id: p.id,
      prenom: p.prenom ?? '',
      nom: p.nom ?? '',
      nomAffiche: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || `Prestataire #${p.id}`,
      ville: p.adresse,
      specialite: p.specialite ?? (Array.isArray(p.services) && p.services.length > 0 ? p.services[0].nom : '')
    }) as ProCard);
  }

  /** Tous les prestataires */
  fetchAllPros() {
    this.proApi.listAll().subscribe(list => {
      this.prosAll = this.mapToProCards(list);
      this.applySort();
      this.resetPaging();
    });
  }

  /** Prestataires filtrés par services sélectionnés (si aucun id → tous) */
  fetchPros() {
    const ids = this.selectedArray();
    if (!ids.length) {
      this.fetchAllPros();
      return;
    }
    this.proApi.listByServiceIds(ids).subscribe(list => {
      this.prosAll = this.mapToProCards(list);
      this.applySort();
      this.resetPaging();
    });
  }

  applySort() {
    const k = this.sortKey;
    this.prosAll.sort((a,b) =>
      (a[k] ?? '').toString().localeCompare((b[k] ?? '').toString(), 'fr', { sensitivity: 'base' })
    );
  }

  filterPros(): ProCard[] {
    const q = this.proQuery.trim().toLowerCase();
    if (!q) return this.prosAll;
    return this.prosAll.filter(p =>
      (p.nomAffiche?.toLowerCase().includes(q)) ||
      (p.ville?.toLowerCase().includes(q)) ||
      (p.specialite?.toLowerCase().includes(q))
    );
  }

  visiblePros(): ProCard[] {
    return this.filterPros().slice(0, this.page * this.pageSize);
  }

  canLoadMore(): boolean {
    return this.filterPros().length > this.page * this.pageSize;
  }

  loadMore() { this.page++; }

  resetPaging() {
    this.page = 1;
    queueMicrotask(() => {
      if (this.rightScrollRef?.nativeElement) this.rightScrollRef.nativeElement.scrollTop = 0;
    });
  }

  /* ------------ UI helpers ------------ */
  initials(nomAffiche: string) {
    const words = (nomAffiche || '').trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    if (words.length === 1 && words[0]) return words[0].slice(0,2).toUpperCase();
    return 'PR';
  }
  avatarBg(id: string|number) {
    const colors = [
      'bg-gradient-to-br from-primary to-primary-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-700',
      'bg-gradient-to-br from-emerald-500 to-emerald-700',
      'bg-gradient-to-br from-amber-500 to-amber-700',
      'bg-gradient-to-br from-sky-500 to-sky-700',
    ];
    const idx = Math.abs(this.hash(String(id))) % colors.length;
    return colors[idx];
  }
  private hash(s: string) { let h=0; for (let i=0;i<s.length;i++) h=((h<<5)-h)+s.charCodeAt(i)|0; return h; }

  clearAll() {
    this.selected.clear();
    this.svcQuery = '';
    this.servicesView = [...this.services];

    this.proQuery = '';
    this.sortKey = 'nomAffiche';
    this.fetchAllPros();
  }
}

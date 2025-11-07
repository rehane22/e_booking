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
  templateUrl: './catalogue-services.page.html',
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

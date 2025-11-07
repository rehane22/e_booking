import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DisponibiliteApi, Disponibilite } from '../../../core/api/disponibilite.api';
import { PrestataireApi } from '../../../core/api/prestataire.api';
import { RendezVousApi } from '../../../core/api/rendezvous.api';

type DayWindow = { start: string; end: string };

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './prestataire-detail.page.html',
})
export class PrestataireDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dispoApi = inject(DisponibiliteApi);
  private proApi = inject(PrestataireApi);
  private rdvApi = inject(RendezVousApi);

  id = '';


  name = '';
  adresse = '';
  specialite = '';
  services: { id: number|string; nom: string }[] = [];
  serviceId: number|string|null = null;


  allDispos: Disponibilite[] = [];


  date = new Date().toISOString().slice(0,10);
  todayISO = new Date().toISOString().slice(0,10);
  dureeMin = 60; 
  heureDebut: string | null = null;


  apiSlots: string[] = [];
  apiSlotsSet = new Set<string>();

  grid: string[] = [];
  stepMin = 30;
  private readonly gridBaseStep = 30;


  loading = false;
  errorText = '';
  successText = '';

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';


    this.proApi.getPublic(this.id).subscribe(p => {
      this.name = `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || `Prestataire #${this.id}`;
      this.adresse = (typeof p.adresse === 'string') ? p.adresse : (p.adresse?.rue || p.adresse?.ville || '');
      this.specialite = p.specialite ?? '';
      this.services = Array.isArray(p.services) ? p.services : [];
      if (this.services.length && !this.serviceId) this.serviceId = this.services[0].id;
      this.onFiltersChange();
    });


    this.dispoApi.listByPrestataire(this.id).subscribe({
      next: (list) => { this.allDispos = list ?? []; this.onFiltersChange(); },
      error: () => { /* on fait sans si erreur */ this.onFiltersChange(); }
    });


    const focus = this.route.snapshot.queryParamMap.get('focus');
    if (focus === 'slots') {
      queueMicrotask(() => document.getElementById('slots')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  /* ---------- Réaction aux filtres ---------- */
  onFiltersChange() {
    this.errorText = '';
    this.successText = '';
    this.heureDebut = null;
    this.loadSlots(); 
  }

  /* ---------- Chargement des slots (API) ---------- */
  loadSlots() {
    this.apiSlots = [];
    this.apiSlotsSet.clear();

    this.dispoApi.slotsForDate(this.id, this.date, this.serviceId ?? undefined, this.dureeMin).subscribe({
      next: (arr) => {
        this.apiSlots = arr ?? [];
        this.apiSlotsSet = new Set(this.apiSlots);


        this.stepMin = this.inferStep(this.apiSlots) ?? this.gridBaseStep;

        this.updateGridMask();
      },
      error: () => {
        this.errorText = 'Impossible de charger les créneaux.';
        this.stepMin = this.gridBaseStep;
        this.updateGridMask();
      }
    });
  }

  /* ---------- Grille & disponibilité ---------- */


  buildDayGrid(): string[] {
    const windows = this.dayWindowsForSelectedDate();
    if (!windows.length) {
    
      if (this.apiSlots.length) {
        const first = this.apiSlots[0];
        const last = this.apiSlots[this.apiSlots.length - 1];
        return this.enumerateTimes(first, this.addMinutes(last, this.gridStep()), this.gridStep());
      }
      return [];
    }

    const grid: string[] = [];
    const step = this.gridStep();
    windows.forEach(w => {
      grid.push(...this.enumerateTimes(w.start, w.end, step));
    });

    return Array.from(new Set(grid));
  }


  dayWindowsForSelectedDate(): DayWindow[] {
    if (!this.allDispos?.length) return [];
    const dayIdx = new Date(this.date).getDay(); 
    const mapJour = ['DIMANCHE','LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'] as const;
    const jourStr = mapJour[dayIdx];

    const filtered = this.allDispos.filter(d =>
      d.jourSemaine === (jourStr as any) &&
      (d.serviceId == null || this.serviceId == null || String(d.serviceId) === String(this.serviceId))
    );
    return filtered.map(d => ({ start: d.heureDebut, end: d.heureFin }));
  }

 
  recomputeGridMask() {
    this.loadSlots();
  }


  isStartReservable(hhmm: string): boolean {
    if (this.isPastSlot(hhmm)) return false;
    if (!this.apiSlotsSet.has(hhmm)) return false;
    const end = this.addMinutes(hhmm, this.dureeMin);
    if (!this.isInsideWindows(end, true)) return false;

    return true;
  }



  isInsideWindows(hhmm: string, allowEnd = false): boolean {
    const windows = this.dayWindowsForSelectedDate();
    const t = this.toMinutes(hhmm);
    return windows.some(w => {
      const s = this.toMinutes(w.start);
      const e = this.toMinutes(w.end);
      return allowEnd ? (t >= s && t <= e) : (t >= s && t < e);
    });
  }

  /* ---------- Sélection ---------- */
  selectStart(hhmm: string) {
    if (!this.isStartReservable(hhmm)) return;
    this.heureDebut = hhmm;
    this.successText = '';
    this.errorText = '';
  }

  /* ---------- Affichage ---------- */
  slotClasses(hhmm: string): string[] {
    const base = ['border', 'h-10', 'rounded-xl', 'px-3', 'text-sm'];
    const selected = this.heureDebut === hhmm;
    const reservable = this.isStartReservable(hhmm);

    if (!reservable) return [...base, 'bg-gray-100', 'text-gray-400', 'border-gray-200', 'cursor-not-allowed', 'line-through'];
    if (selected) return [...base, 'bg-primary', 'text-white', 'border-primary', 'shadow-sm'];
    return [...base, 'hover:bg-rose-card', 'border-gray-200', 'text-ink'];
  }

  /* ---------- Utils temps ---------- */
  inferStep(slots: string[]): number | null {
    if (slots.length >= 2) {
      const d = this.toMinutes(slots[1]) - this.toMinutes(slots[0]);
      if (d > 0 && d % 5 === 0) return d; 
    }
    return null;
  }
  enumerateTimes(start: string, end: string, step: number): string[] {
    const res: string[] = [];
    for (let t = this.toMinutes(start); t < this.toMinutes(end); t += step) {
      res.push(this.fromMinutes(t));
    }
    return res;
  }
  toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
    }
  fromMinutes(m: number): string {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  addMinutes(hhmm: string, delta: number): string {
    return this.fromMinutes(this.toMinutes(hhmm) + delta);
  }

  private updateGridMask() {
    this.grid = this.buildDayGrid();
    if (this.heureDebut && !this.isStartReservable(this.heureDebut)) {
      this.heureDebut = null;
    }
  }

  private gridStep(): number {
    const effectiveStep = (this.stepMin && this.stepMin > 0) ? this.stepMin : this.gridBaseStep;
    return Math.min(this.gridBaseStep, effectiveStep);
  }

  /* ---------- Past / Reserve ---------- */
  isPastSlot(hhmm: string): boolean {
    const now = new Date();
    const selectedDate = new Date(`${this.date}T00:00:00`);
    const today = new Date(`${this.todayISO}T00:00:00`);
    if (selectedDate < today) return true;
    if (this.date > this.todayISO) return false;


    const [h, m] = hhmm.split(':').map(Number);
    const slot = new Date(now);
    slot.setHours(h, m, 0, 0);
    return slot.getTime() <= now.getTime();
  }

  heureFinPreview(): string {
    if (!this.heureDebut) return '';
    const endMin = this.toMinutes(this.heureDebut) + this.dureeMin;
    return this.fromMinutes(endMin);
  }

  canReserve() {
    return !!this.heureDebut && !!this.serviceId && this.isStartReservable(this.heureDebut);
  }

  reserve() {
    if (!this.canReserve()) {
      if (this.heureDebut && !this.isStartReservable(this.heureDebut)) {
        this.errorText = 'Créneau indisponible (réservé, chevauchement ou passé).';
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const roles = JSON.parse(localStorage.getItem('roles') || '[]') as string[];
    if (!token || !roles.includes('CLIENT')) {
      alert('Connecte-toi en tant que client pour réserver cette plage.');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const payload = {
      serviceId: this.serviceId as (number|string),
      prestataireId: this.id,
      date: this.date,
      heure: this.heureDebut as string,
      dureeMin: this.dureeMin
    };

    this.loading = true;
    this.errorText = '';
    this.successText = '';

    this.rdvApi.create(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successText = 'Réservation créée avec succès. Statut : EN_ATTENTE.';
        this.router.navigate(['/mon-compte']);
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;
        const msg = (err?.error?.message || err?.error || '').toString();

        if (status === 401) { this.errorText = 'Connecte-toi pour réserver.'; this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } }); return; }
        if (status === 403) { this.errorText = 'Accès refusé.'; return; }
        if (status === 409) { this.errorText = 'Conflit : nom déjà pris / doublon.'; return; }
        if (status === 422) { this.errorText = msg || 'Créneau indisponible ou requête invalide.'; return; }
        this.errorText = 'Erreur inattendue. Réessaie.';
      }
    });
  }

  resetSelection() {
    this.heureDebut = null;
    this.successText = '';
    this.errorText = '';
  }

  /* Helpers UI */
  initials(full: string) {
    const words = (full || '').trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    if (words.length === 1 && words[0]) return words[0].slice(0,2).toUpperCase();
    return 'PR';
  }
  avatarBg(seed: any) {
    const colors = [
      'bg-gradient-to-br from-primary to-primary-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-700',
      'bg-gradient-to-br from-emerald-500 to-emerald-700',
      'bg-gradient-to-br from-amber-500 to-amber-700',
      'bg-gradient-to-br from-sky-500 to-sky-700',
    ];
    const idx = Math.abs(this.hash(String(seed))) % colors.length;
    return colors[idx];
  }
  private hash(s: string) { let h=0; for (let i=0;i<s.length;i++) h=((h<<5)-h)+s.charCodeAt(i)|0; return h; }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DisponibiliteApi, Disponibilite } from '../../../core/api/disponibilite.api';
import { PrestataireApi } from '../../../core/api/prestataire.api';
import { RendezVousApi } from '../../../core/api/rendezvous.api';

type DayWindow = { start: string; end: string }; // "HH:mm"

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Prestataire</h1>
      <button class="btn-ghost h-10" routerLink="/services">← Retour au catalogue</button>
    </div>

    <!-- PROFIL -->
    <section class="card p-6 mt-6 flex flex-col md:flex-row gap-5 md:items-center">
      <div class="h-20 w-20 rounded-2xl grid place-items-center text-white font-semibold text-xl"
           [ngClass]="avatarBg(id)">
        {{ initials(name) }}
      </div>
      <div class="flex-1">
        <p class="text-xl font-medium">{{ name }}</p>
        <p class="text-sm text-muted">
          @if (specialite) { {{ specialite }} }
        </p>
      </div>
    </section>

    <!-- À PROPOS -->
    <section id="about" class="card p-6 mt-4">
      <h3 class="font-semibold mb-2">À propos</h3>
      <div class="space-y-1 text-sm text-muted">
        <p>Adresse : <b>{{ adresse || '—' }}</b></p>
        <p>Spécialité : <b>{{ specialite || '—' }}</b></p>
      </div>
    </section>

    <!-- CRÉNEAUX + RÉSERVATION -->
    <section id="slots" class="card p-6 mt-4">
      <div class="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 class="font-semibold">Créneaux disponibles</h3>
        <div class="text-sm text-muted"><b>{{ name }}</b></div>
      </div>

      <!-- Filtres -->
      <div class="grid sm:grid-cols-4 gap-3 mt-4">
        <div>
          <label class="text-xs">Date</label>
          <input class="input h-10 w-full"
                 type="date"
                 [(ngModel)]="date"
                 [attr.min]="todayISO"
                 (ngModelChange)="onFiltersChange()">
        </div>

        <div class="sm:col-span-2">
          <label class="text-xs">Service (obligatoire)</label>
          <select class="input h-10 w-full" [(ngModel)]="serviceId" (ngModelChange)="onFiltersChange()">
            <option [ngValue]="null" disabled>— Sélectionner —</option>
            @for (s of services; track s.id) {
              <option [ngValue]="s.id">{{ s.nom }}</option>
            } @empty {
              <option [ngValue]="null" disabled>Aucun service lié</option>
            }
          </select>
        </div>

        <div>
          <label class="text-xs">Durée</label>
          <select class="input h-10 w-full" [(ngModel)]="dureeMin" (ngModelChange)="recomputeGridMask()">
            <option [ngValue]="15">15 min</option>
            <option [ngValue]="30">30 min</option>
            <option [ngValue]="45">45 min</option>
            <option [ngValue]="60">1 h</option>
            <option [ngValue]="75">1 h 15</option>
            <option [ngValue]="90">1 h 30</option>
            <option [ngValue]="105">1 h 45</option>
            <option [ngValue]="120">2 h</option>
          </select>
        </div>
      </div>

      <!-- Aperçu -->
      <div class="mt-2 text-sm text-muted">
        @if (heureDebut) {
          <span>Aperçu : <b>{{ heureDebut }}</b> → <b>{{ heureFinPreview() }}</b> ({{ dureeMin }} min)</span>
        } @else {
          <span>Sélectionne une heure de début ci-dessous</span>
        }
      </div>

      <!-- Grille complète des créneaux -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        @for (t of grid; track t) {
          <button
            class="h-10 rounded-xl border transition-colors px-3 text-sm"
            [ngClass]="slotClasses(t)"
            [disabled]="!isStartReservable(t)"
            [attr.aria-pressed]="t === heureDebut"
            (click)="selectStart(t)">
            {{ t }}
          </button>
        } @empty {
          <div class="text-sm text-muted col-span-full">Aucun créneau disponible.</div>
        }
      </div>

      <!-- Légende -->
      <div class="mt-3 text-xs text-muted flex gap-4 items-center">
        <span class="inline-flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded bg-primary"></span> Sélectionné
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded bg-gray-200"></span> Indisponible (réservé/chevauchement/passé)
        </span>
      </div>

      <!-- Actions -->
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn-primary h-11 px-6"
                [disabled]="!canReserve() || loading"
                (click)="reserve()">
          @if (!loading) { Réserver }
          @else { <span class="opacity-80">Réservation…</span> }
        </button>
        <button class="btn-ghost h-11" (click)="resetSelection()" [disabled]="!heureDebut || loading">Réinitialiser</button>
      </div>

      @if (errorText) {
        <div class="mt-3 text-sm text-red-600">{{ errorText }}</div>
      }
      @if (successText) {
        <div class="mt-3 text-sm text-emerald-600">{{ successText }}</div>
      }
    </section>
  </div>
  `
})
export class PrestataireDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dispoApi = inject(DisponibiliteApi);
  private proApi = inject(PrestataireApi);
  private rdvApi = inject(RendezVousApi);

  id = '';

  // Profil public
  name = '';
  adresse = '';
  specialite = '';
  services: { id: number|string; nom: string }[] = [];
  serviceId: number|string|null = null;

  // Disponibilités (hebdo) pour construire la grille du jour
  allDispos: Disponibilite[] = [];

  // Sélection & grille
  date = new Date().toISOString().slice(0,10);
  todayISO = new Date().toISOString().slice(0,10);
  dureeMin = 60; // par défaut pour bien reproduire ton cas
  heureDebut: string | null = null;

  // Slots retournés par l’API (début potentiels réellement libres)
  apiSlots: string[] = [];
  apiSlotsSet = new Set<string>();

  // Grille affichée (toute la plage d’ouverture du jour, pas = stepMin)
  grid: string[] = [];
  stepMin = 30;

  // UI state
  loading = false;
  errorText = '';
  successText = '';

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';

    // Profil public
    this.proApi.getPublic(this.id).subscribe(p => {
      this.name = `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || `Prestataire #${this.id}`;
      this.adresse = (typeof p.adresse === 'string') ? p.adresse : (p.adresse?.rue || p.adresse?.ville || '');
      this.specialite = p.specialite ?? '';
      this.services = Array.isArray(p.services) ? p.services : [];
      if (this.services.length && !this.serviceId) this.serviceId = this.services[0].id;
      this.onFiltersChange();
    });

    // Récupère les dispos hebdo une seule fois (pour construire la grille du jour)
    this.dispoApi.listByPrestataire(this.id).subscribe({
      next: (list) => { this.allDispos = list ?? []; this.onFiltersChange(); },
      error: () => { /* on fait sans si erreur */ this.onFiltersChange(); }
    });

    // Scroll éventuel
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
    this.loadSlots(); // charge apiSlots puis reconstruit la grille/mask
  }

  /* ---------- Chargement des slots (API) ---------- */
  loadSlots() {
    this.apiSlots = [];
    this.apiSlotsSet.clear();

    this.dispoApi.slotsForDate(this.id, this.date, this.serviceId ?? undefined).subscribe({
      next: (arr) => {
        this.apiSlots = arr ?? [];
        this.apiSlotsSet = new Set(this.apiSlots);

        // infère le pas (15/30) d'après les 2 premiers slots sinon 30
        this.stepMin = this.inferStep(this.apiSlots) ?? 30;

        // reconstruit la grille du jour (toutes les cases, même celles indispo)
        this.grid = this.buildDayGrid();

        // applique le masque “réservable si toutes les cases couvrant la durée sont libres”
        this.recomputeGridMask();
      },
      error: () => {
        this.errorText = 'Impossible de charger les créneaux.';
        // même si erreur, on tente de montrer une grille basée sur les dispos
        this.stepMin = 30;
        this.grid = this.buildDayGrid();
      }
    });
  }

  /* ---------- Grille & disponibilité ---------- */

  // Crée la grille complète du jour en utilisant les fenêtres d’ouverture correspondant au jour de semaine & service
  buildDayGrid(): string[] {
    const windows = this.dayWindowsForSelectedDate();
    if (!windows.length) {
      // fallback : bornes min/max basées sur les slots API s’ils existent
      if (this.apiSlots.length) {
        const first = this.apiSlots[0];
        const last = this.apiSlots[this.apiSlots.length - 1];
        return this.enumerateTimes(first, this.addMinutes(last, this.stepMin), this.stepMin);
      }
      return [];
    }

    // fusionne les fenêtres (au cas où il y en ait plusieurs)
    const grid: string[] = [];
    windows.forEach(w => {
      grid.push(...this.enumerateTimes(w.start, w.end, this.stepMin));
    });
    // déduplique en conservant l’ordre
    return Array.from(new Set(grid));
  }

  // Retourne les fenêtres d’ouverture (start/end) pour le jour sélectionné, filtrées par service si défini
  dayWindowsForSelectedDate(): DayWindow[] {
    if (!this.allDispos?.length) return [];
    const dayIdx = new Date(this.date).getDay(); // 0=Sun ... 6=Sat
    const mapJour = ['DIMANCHE','LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'] as const;
    const jourStr = mapJour[dayIdx];

    const filtered = this.allDispos.filter(d =>
      d.jourSemaine === (jourStr as any) &&
      (d.serviceId == null || this.serviceId == null || String(d.serviceId) === String(this.serviceId))
    );
    return filtered.map(d => ({ start: d.heureDebut, end: d.heureFin }));
  }

  // Met à jour la logique de masquage selon la durée (pas de state à garder — tout est calculé dans isStartReservable)
  recomputeGridMask() {
    // rien à stocker : on recalculera à la volée via isStartReservable / slotClasses
  }

  // Un début est réservable si:
  //  - il n’est pas dans le passé
  //  - il est présent dans apiSlots
  //  - et toutes les cases suivantes couvrant la durée sont aussi dans apiSlots
  //  - et il ne dépasse pas la fenêtre d’ouverture
  isStartReservable(hhmm: string): boolean {
    if (this.isPastSlot(hhmm)) return false;
    if (!this.apiSlotsSet.has(hhmm)) return false;

    const needed = Math.ceil(this.dureeMin / this.stepMin);
    for (let i = 0; i < needed; i++) {
      const t = this.addMinutes(hhmm, i * this.stepMin);
      if (!this.apiSlotsSet.has(t)) return false; // une case manque → chevauchement/indispo
      if (!this.isInsideWindows(t)) return false; // hors ouverture
    }
    // vérifie aussi que la fin tombe encore à l’intérieur
    const end = this.addMinutes(hhmm, this.dureeMin);
    if (!this.isInsideWindows(end, true)) return false;

    return true;
  }

  // Le temps est-il dans une des fenêtres d’ouverture du jour ?
  // if allowEnd==true, on autorise end == window.end
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
      if (d > 0 && d % 5 === 0) return d; // 15/30/60…
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

  /* ---------- Past / Reserve ---------- */
  isPastSlot(hhmm: string): boolean {
    const now = new Date();
    const selectedDate = new Date(`${this.date}T00:00:00`);
    const today = new Date(`${this.todayISO}T00:00:00`);
    if (selectedDate < today) return true;
    if (this.date > this.todayISO) return false;

    // même jour
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
      heure: this.heureDebut as string
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

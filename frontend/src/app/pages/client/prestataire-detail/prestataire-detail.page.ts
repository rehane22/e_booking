import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DisponibiliteApi } from '../../../core/api/disponibilite.api';
import { PrestataireApi } from '../../../core/api/prestataire.api';
import { RendezVousApi } from '../../../core/api/rendezvous.api';

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
          <input class="input h-10 w-full" type="date" [(ngModel)]="date" (ngModelChange)="loadSlots()">
        </div>

        <div class="sm:col-span-2">
          <label class="text-xs">Service (obligatoire)</label>
          <select class="input h-10 w-full" [(ngModel)]="serviceId" (ngModelChange)="loadSlots()">
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
          <select class="input h-10 w-full" [(ngModel)]="dureeMin">
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

      <!-- Liste des créneaux (heure de début) -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        @for (s of slots; track s) {
          <button
            class="h-10 rounded-xl border hover:bg-rose-card"
            [class.border-primary]="s === heureDebut"
            (click)="selectStart(s)">
            {{ s }}
          </button>
        } @empty {
          <div class="text-sm text-muted col-span-full">Aucun créneau disponible.</div>
        }
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
  adresse = '';       // string
  specialite = '';
  services: { id: number|string; nom: string }[] = [];
  serviceId: number|string|null = null; // requis pour POST /rendezvous

  // Slots & sélection
  date = new Date().toISOString().slice(0,10);
  slots: string[] = [];
  dureeMin = 30;      // UI only (le back n'a pas de champ duree)
  heureDebut: string | null = null; // HH:mm

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

      // Pré-sélectionne le premier service si dispo
      if (this.services.length && !this.serviceId) {
        this.serviceId = this.services[0].id;
      }

      // Recharge les slots avec le service sélectionné
      this.loadSlots();
    });

    // Focus sur slots si demandé
    const focus = this.route.snapshot.queryParamMap.get('focus');
    if (focus === 'slots') {
      queueMicrotask(() => document.getElementById('slots')?.scrollIntoView({ behavior: 'smooth' }));
    }

    // Chargement initial de slots (avant d'avoir récupéré les services, on passe null)
    this.loadSlots();
  }

  /* -------- Slots -------- */
  loadSlots() {
    this.errorText = '';
    this.successText = '';
    this.slots = [];
    this.heureDebut = null;

    this.dispoApi.slotsForDate(this.id, this.date, this.serviceId ?? undefined).subscribe({
      next: (arr) => this.slots = arr ?? [],
      error: () => this.errorText = 'Impossible de charger les créneaux.'
    });
  }

  selectStart(hhmm: string) {
    this.heureDebut = hhmm;
    this.successText = '';
    this.errorText = '';
  }

  heureFinPreview(): string {
    if (!this.heureDebut) return '';
    const start = new Date(`${this.date}T${this.heureDebut}:00`);
    const end = new Date(start.getTime() + this.dureeMin * 60000);
    const hh = String(end.getHours()).padStart(2, '0');
    const mm = String(end.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  canReserve() {
    return !!this.heureDebut && !!this.serviceId;
  }

  /* -------- Réservation réelle -------- */
  reserve() {
    if (!this.canReserve()) return;

    // Sécurité côté UI
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
      // NOTE: ta méthode create(...) ne prend pas de durée → non envoyé.
    };

    this.loading = true;
    this.errorText = '';
    this.successText = '';

    this.rdvApi.create(payload).subscribe({
      next: (resp) => {
        this.loading = false;
        this.successText = 'Réservation créée avec succès. Statut : EN_ATTENTE.';
        // Optionnel: redirection vers /mon-compte/rendezvous
        // this.router.navigate(['/mon-compte/rendezvous']);
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;
        const msg = (err?.error?.message || err?.error || '').toString();

        if (status === 401) {
          this.errorText = 'Connecte-toi pour réserver.';
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
          return;
        }
        if (status === 403) {
          this.errorText = 'Accès refusé.';
          return;
        }
        if (status === 409) {
          this.errorText = 'Conflit : nom déjà pris / doublon.';
          return;
        }
        if (status === 422) {
          // messages renvoyés par ton service:
          //  - "Ce prestataire n'offre pas ce service"
          //  - "Pas de créneau disponible couvrant cet horaire"
          //  - "Créneau déjà réservé"
          if (msg) this.errorText = msg;
          else this.errorText = 'Créneau indisponible ou requête invalide.';
          return;
        }
        this.errorText = 'Erreur inattendue. Réessaie.';
      }
    });
  }

  resetSelection() {
    this.heureDebut = null;
    this.successText = '';
    this.errorText = '';
  }

  /* -------- UI helpers -------- */
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

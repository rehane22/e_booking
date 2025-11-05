import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
   <div class="max-w-6xl mx-auto space-y-6"> <div class="flex items-center justify-between mt-4"> <h1 class="text-2xl font-semibold">Espace Pro</h1> </div>

    <!-- Infos pro -->
@if (me) { <div class="card p-6"> <div class="grid sm:grid-cols-2 gap-4"> <p class="text-sm"><b>Spécialité:</b> {{ me.specialite || '—' }}</p> <p class="text-sm"><b>Adresse:</b> {{ me.adresse || '—' }}</p> </div> </div> }

    <div class="grid md:grid-cols-3 gap-6">
      <!-- Carte RDV avec 3 compteurs -->
      <section class="card p-6">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Rendez-vous</h3>
        </div>

        @if (loading) {
          <div class="mt-4 animate-pulse space-y-3">
            <div class="h-4 bg-black/10 rounded w-28"></div>
            <div class="h-10 bg-black/10 rounded"></div>
            <div class="h-16 bg-black/10 rounded"></div>
          </div>
        } @else {
          @if (error) {
            <p class="text-sm text-red-600 mt-2">{{ error }}</p>
          }

          <!-- KPIs -->
          <div class="grid grid-cols-3 gap-3 mt-3">
            <div class="rounded-2xl border border-black/10 p-3">
              <p class="text-xs text-black/60">Aujourd’hui</p>
              <p class="text-2xl font-semibold">{{ todayCount }}</p>
            </div>
            <div class="rounded-2xl border border-black/10 p-3">
              <p class="text-xs text-black/60">À venir</p>
              <p class="text-2xl font-semibold">{{ upcomingCount }}</p>
            </div>
            <div class="rounded-2xl border border-black/10 p-3">
              <p class="text-xs text-black/60">Passés</p>
              <p class="text-2xl font-semibold">{{ pastCount }}</p>
            </div>
          </div>

          <!-- Prochain RDV -->
          <div class="mt-4">
            <p class="text-xs text-muted">Prochain rendez-vous</p>
            @if (nextRdv) {
              <div class="mt-2 p-4 rounded-2xl border border-black/10">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="font-medium">{{ nextRdv.serviceNom || 'Prestation' }}</div>
                    <div class="text-sm text-black/70">
                      {{ formatFr(nextRdv.date) }} — {{ nextRdv.heure }}
                      <span class="mx-1">·</span>
           
                      {{ nextRdv.clientNom || 'Client' }}
                    </div>
                    <span class="badge mt-2" [ngClass]="badgeClass(nextRdv.statut)">
                      {{ labelStatut(nextRdv.statut) }}
                    </span>
                  </div>
                  <div class="flex gap-2 shrink-0">
                    @if (nextRdv.statut === 'EN_ATTENTE') {
                      <button class="btn-ghost h-9" (click)="confirmer(nextRdv!)">Confirmer</button>
                    }
                    @if (nextRdv.statut !== 'ANNULE' && nextRdv.statut !== 'REFUSE') {
                      <button class="btn-ghost h-9 text-red-600" (click)="refuser(nextRdv!)">Refuser</button>
                    }
                  </div>
                </div>
              </div>
            } @else {
              <div class="mt-2 text-sm text-muted">Aucun rendez-vous à venir.</div>
            }
          </div>

          <!-- Actions rapides -->
          <div class="mt-4 flex flex-wrap gap-2">
            <a routerLink="/pro/rendezvous" class="btn-ghost h-9">Gérer les RDV</a>
          </div>
        }
      </section>

      <!-- Disponibilités -->
      <section class="card p-6">
        <h3 class="font-semibold">Disponibilités</h3>
        <p class="text-sm text-muted mt-1">Mettez à jour vos créneaux</p>
        <div class="mt-3 flex gap-2">
          <a routerLink="/pro/disponibilites" class="btn-ghost h-10">Gérer</a>
        </div>
      </section>

      <!-- Services -->
      <section class="card p-6">
        <h3 class="font-semibold">Services</h3>
        <p class="text-sm text-muted mt-1">Reliez vos prestations au catalogue</p>
        <div class="mt-3 flex gap-2">
          <a routerLink="/pro/services" class="btn-primary h-10">Configurer</a>
          <a routerLink="/services" class="btn-ghost h-10">Voir le catalogue</a>
        </div>
      </section>
    </div>
  </div>
  `
})
export class DashboardPage implements OnInit {
  private proApi = inject(PrestataireApi);
  private rdvApi = inject(RendezVousApi);

  me!: PrestataireMe;

  loading = true;
  error = '';

  // KPIs
  todayCount = 0;
  upcomingCount = 0;
  pastCount = 0;

  nextRdv: Rdv | null = null;

  ngOnInit() {
    this.proApi.me().subscribe({
      next: (me) => {
        this.me = me;
        this.loadKpis();
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger votre profil.';
      }
    });
  }

  /* ---- Data ---- */
  private loadKpis() {
    // On récupère tous les RDV du pro (sans filtre date côté API).
    this.rdvApi.listByPrestataire(this.me.id).subscribe({
           
      next: (list) => {
        this.computeCounts(list);
        this.nextRdv = this.pickNext(list);
        this.loading = false;
        this.error = '';
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger vos rendez-vous.';
      }
    });
  }

  private computeCounts(list: Rdv[]) {
    const now = new Date();
    const todayISO = now.toISOString().slice(0,10);
    const nowHm = now.toTimeString().slice(0,5);

    let today = 0, upcoming = 0, past = 0;

    for (const r of list) {
      if (r.date === todayISO) {
        // même jour : compare heure
        if (r.heure >= nowHm) { today++; } else { past++; }
      } else if (r.date > todayISO) {
        upcoming++;
      } else {
        past++;
      }
    }

    this.todayCount = today;
    this.upcomingCount = upcoming;
    this.pastCount = past;
  }

  private pickNext(list: Rdv[]): Rdv | null {
    // prochain RDV (>= maintenant), tri date + heure
    const now = new Date();
    const todayISO = now.toISOString().slice(0,10);
    const nowHm = now.toTimeString().slice(0,5);

    const futurs = list.filter(r =>
      r.date > todayISO || (r.date === todayISO && r.heure >= nowHm)
    );

    futurs.sort((a,b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));
    return futurs[0] ?? null;
  }

  /* ---- Actions rapides ---- */
  confirmer(r: Rdv) {
    this.rdvApi.confirmer(r.id).subscribe({
      next: () => this.loadKpis(),
      error: e => alert('Confirmation impossible: ' + (e.error?.message ?? e.status))
    });
  }
  refuser(r: Rdv) {
    if (!confirm('Refuser ce rendez-vous ? Le créneau sera libéré.')) return;
    this.rdvApi.refuser(r.id).subscribe({
      next: () => this.loadKpis(),
      error: e => alert('Refus impossible: ' + (e.error?.message ?? e.status))
    });
  }

  /* ---- UI helpers ---- */
  badgeClass(statut: Rdv['statut'] | string) {
    const s = String(statut);
    switch (s) {
      case 'EN_ATTENTE': return 'bg-amber-100 text-amber-900';
      case 'CONFIRME':   return 'bg-emerald-100 text-emerald-900';
      case 'ANNULE':     return 'bg-gray-200 text-gray-700';
      case 'REFUSE':     return 'bg-rose-100 text-rose-900';
      default:           return '';
    }
  }
  labelStatut(s: Rdv['statut'] | string) {
    const v = String(s);
    return v === 'EN_ATTENTE' ? 'En attente'
         : v === 'CONFIRME'   ? 'Confirmé'
         : v === 'ANNULE'     ? 'Annulé'
         : v === 'REFUSE'     ? 'Refusé'
         : v;
  }
  formatFr(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00');
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(d);
  }
}

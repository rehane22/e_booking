import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  private proApi = inject(PrestataireApi);
  private rdvApi = inject(RendezVousApi);

  me!: PrestataireMe;

  loading = true;
  error = '';


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

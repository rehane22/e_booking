import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';
import { UserApi, UserMe } from '../../../core/api/user.api';
import { UsersApi, UpdateUserPayload } from '../../../core/api/users.api';

type RowVM = Rdv & {
  dateLabel: string;
  heureFin: string;
  badgeClass: string;
  serviceLabel: string;
  prestataireLabel: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './mon-compte.page.html',
})
export class MonComptePage implements OnInit {
  private userApi = inject(UserApi);
  private usersApi = inject(UsersApi);
  private rdvApi = inject(RendezVousApi);
  private fb = inject(FormBuilder);

  me: UserMe | null = null;

  form: { prenom: string; nom: string; telephone: string } = { prenom: '', nom: '', telephone: '' };
  saving = false;
  saveOk = false;
  saveError = '';

  // RDV (version “pro-like”)
  filters = this.fb.group({ date: [''], statut: [''] });
  rdvs: RowVM[] = [];
  futurs: RowVM[] = [];
  passes: RowVM[] = [];
  pastOpen = false;
  cancelingId: number | string | null = null;
  listError = '';

  ngOnInit() { this.loadMeAndRdvs(); }

  has(role: string){ try { return (JSON.parse(localStorage.getItem('roles')||'[]') as string[]).includes(role); } catch { return false; } }

  /* -------- Profil -------- */
  private loadMeAndRdvs() {
    this.saveOk = false; this.saveError = ''; this.listError = '';
    this.userApi.me().subscribe({
      next: (u) => {
        this.me = u;
        this.form = { prenom: u.prenom ?? '', nom: u.nom ?? '', telephone: u.telephone ?? '' };
        this.loadRdvs(); // charge + map + split
      },
      error: () => { this.saveError = 'Impossible de charger ton profil (connecte-toi).'; }
    });
  }

  save() {
    if (!this.me) return;
    const body: UpdateUserPayload = {
      prenom: (this.form.prenom || '').trim(),
      nom: (this.form.nom || '').trim(),
      telephone: (this.form.telephone || '').trim() || null
    };
    this.saving = true; this.saveOk = false; this.saveError = '';

    this.usersApi.updateById(this.me.id, body).subscribe({
      next: () => {
        this.saving = false;
        this.saveOk = true;
        this.userApi.me().subscribe(m => this.me = m);
      },
      error: (err) => {
        this.saving = false;
        const msg = (err?.error?.message || err?.error || '').toString();
        this.saveError = msg || 'Erreur lors de la mise à jour.';
      }
    });
  }

  reset() {
    if (!this.me) return;
    this.form = { prenom: this.me.prenom ?? '', nom: this.me.nom ?? '', telephone: this.me.telephone ?? '' };
    this.saveOk = false; this.saveError = '';
  }

  /* -------- RDV (client) -------- */
  apply(){ this.loadRdvs(); }
  clear(){ this.filters.reset({ date: '', statut: '' }); this.loadRdvs(); }

 private loadRdvs() {
  if (!this.me) return;

  const dateFilter = (this.filters.value.date || '') as string;
  const statutFilter = (this.filters.value.statut || '') as string;

  this.rdvApi.listByClient(this.me.id).subscribe({
    next: (items) => {
      // filtrage front par date + statut
      const filtered = items.filter(r =>
        (dateFilter ? r.date === dateFilter : true) &&
        (statutFilter ? r.statut === statutFilter : true)
      );

      const mapped = filtered
        .map(r => {
          const dateLabel = this.formatFr(r.date);
          const duree = (r as any).serviceDureeMin ?? 60; // fallback 60'
          const heureFin = this.addMinutes(r.date, r.heure, duree);
          const badgeClass = this.badgeClass(r.statut);
          const serviceLabel = (r as any).serviceNom ?? 'Prestation';
          const prestataireLabel = (r as any).prestataireNom ?? `Prestataire #${r.prestataireId}`;
          return { ...r, dateLabel, heureFin, badgeClass, serviceLabel, prestataireLabel };
        })
        .sort((a,b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));

      // split futurs / passés
      const now = new Date();
      const todayStr = now.toISOString().slice(0,10);
      const nowHm = now.toTimeString().slice(0,5);
      const futurs = [] as RowVM[];
      const passes = [] as RowVM[];

      for (const r of mapped) {
        if (r.date > todayStr || (r.date === todayStr && r.heure >= nowHm)) futurs.push(r);
        else passes.push(r);
      }

      this.rdvs = mapped;
      this.futurs = futurs;
      this.passes = passes;
      this.listError = '';
    },
    error: () => this.listError = 'Impossible de charger tes rendez-vous.'
  });
}


  cancel(r: RowVM) {
    if (r.statut === 'ANNULE') return;
    if (!confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
    this.cancelingId = r.id;
    this.rdvApi.annuler(r.id).subscribe({
      next: () => { this.cancelingId = null; this.loadRdvs(); },
      error: (err) => { this.cancelingId = null; alert((err?.error?.message || err?.error || '').toString() || 'Annulation impossible.'); }
    });
  }

  /* -------- Helpers d’affichage (mêmes codes que la page pro) -------- */
  formatFr(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00');
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(d);
  }
  addMinutes(dateISO: string, hhmm: string, minutes: number): string {
    const [H,M] = hhmm.split(':').map(Number);
    const d = new Date(dateISO + 'T00:00:00');
    d.setHours(H, M + minutes, 0, 0);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }
 badgeClass(statut: Rdv['statut'] | string) {
  const s = (statut as string);
  switch (s) {
    case 'EN_ATTENTE': return 'bg-amber-100 text-amber-900';
    case 'CONFIRME':   return 'bg-emerald-100 text-emerald-900';
    case 'ANNULE':     return 'bg-gray-200 text-gray-700';
    case 'REFUSE':     return 'bg-rose-100 text-rose-900';
    default:           return '';
  }
}

labelStatut(s: Rdv['statut'] | string) {
  const v = (s as string);
  return v === 'EN_ATTENTE' ? 'En attente'
       : v === 'CONFIRME'   ? 'Confirmé'
       : v === 'ANNULE'     ? 'Annulé'
       : v === 'REFUSE'     ? 'Refusé'
       : v;
}

  private toDateTime(r: RowVM): Date {
    const [h,m] = r.heure.split(':').map(Number);
    const d = new Date(r.date + 'T00:00:00');
    d.setHours(h, m, 0, 0);
    return d;
  }
  estPasse(r: RowVM): boolean { return this.toDateTime(r).getTime() < Date.now(); }
  private isSameDay(a: Date, b: Date){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  private isTomorrow(d: Date, now=new Date()){ const t = new Date(now); t.setDate(now.getDate()+1); return this.isSameDay(d,t); }
  badgeTempsLabel(r: RowVM){
    const d=this.toDateTime(r), now=new Date();
    if (this.isSameDay(d,now))   return 'Aujourd’hui';
    if (this.isTomorrow(d,now))  return 'Demain';
    if (this.estPasse(r))        return 'Passé';
    return 'À venir';
  }
  badgeTempsClasses(r: RowVM){
    const passed=this.estPasse(r);
    return {
      'border-emerald-300 text-emerald-700 bg-emerald-50': !passed && this.isSameDay(this.toDateTime(r), new Date()),
      'border-amber-300 text-amber-700 bg-amber-50': !passed && !this.isSameDay(this.toDateTime(r), new Date()),
      'border-gray-300 text-gray-600 bg-gray-50': passed
    };
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AdminUserApi, AdminUserDetail } from '../../../core/api/admin-user.api';
import { UsersApi, UpdateUserPayload } from '../../../core/api/users.api';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';

type RowVM = Rdv & {
  dateLabel: string;
  heureFin: string;
  badgeClass: string;
  serviceLabel: string;
  prestataireLabel: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-detail.page.html',
})
export class UserDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminApi = inject(AdminUserApi);
  private usersApi = inject(UsersApi);
  private rdvApi = inject(RendezVousApi);
  private fb = inject(FormBuilder);

  id!: number;
  user?: AdminUserDetail;


  form = { prenom: '', nom: '', telephone: '' };
  saving = false; deleting = false;
  saveOk = false; saveError = '';


  filters = this.fb.group({ date: [''], statut: [''] });
  loadingRdv = false;
  rdvs: RowVM[] = [];
  futurs: RowVM[] = [];
  passes: RowVM[] = [];
  pastOpen = false;
  cancelingId: number | string | null = null;
  listError = '';

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.reload();
  }

  reload() {
    this.usersApi.getById(this.id).subscribe(u => {
      this.user = u as unknown as AdminUserDetail;
      this.form = { prenom: u.prenom || '', nom: u.nom || '', telephone: u.telephone || '' };
    });
    this.loadRdvs();
  }

  /* ----- Profil ----- */
  save() {
    if (!this.user) return;
    const body: UpdateUserPayload = {
      prenom: (this.form.prenom || '').trim(),
      nom: (this.form.nom || '').trim(),
      telephone: (this.form.telephone || '').trim() || null
    };
    this.saving = true; this.saveOk = false; this.saveError = '';
    this.usersApi.updateById(this.id, body).subscribe({
      next: () => { this.saving = false; this.saveOk = true; this.reload(); },
      error: (err) => { this.saving = false; this.saveError = (err?.error?.message || err?.error || '').toString() || 'Erreur lors de la mise à jour.'; }
    });
  }

  deleteUser() {
    if (!this.user) return;
    if (!confirm(`Supprimer définitivement ${this.user.prenom} ${this.user.nom} ?`)) return;
    this.deleting = true;
    this.usersApi.deleteById(this.id).subscribe({
      next: () => this.router.navigate(['/admin/users']),
      error: (err) => { this.deleting = false; alert((err?.error?.message || err?.error || '').toString() || 'Suppression impossible.'); }
    });
  }

  activate() {
    if (!this.user) return;
    if (!confirm(`Activer le compte de ${this.user.prenom} ${this.user.nom} ?`)) return;
    this.adminApi.activate(this.user.id).subscribe(() => this.reload());
  }

  block() {
    if (!this.user) return;
    if (!confirm(`Bloquer le compte de ${this.user.prenom} ${this.user.nom} ?`)) return;
    this.adminApi.block(this.user.id).subscribe(() => this.reload());
  }

  statusBadge(statut: string) {
    return {
      'badge px-2 py-1 rounded-lg text-xs': true,
      'bg-green-100 text-green-700': statut === 'ACTIF',
      'bg-rose-100 text-rose-700': statut === 'BLOQUE',
    };
  }

  /* ----- RDV helpers + chargement ----- */
  apply(){ this.loadRdvs(); }
  clear(){ this.filters.reset({ date: '', statut: '' }); this.loadRdvs(); }

  private loadRdvs() {
    this.loadingRdv = true; this.listError = '';
    this.rdvApi.listByClient(this.id).subscribe({
      next: (items) => {
        const dateFilter = (this.filters.value.date || '') as string;
        const statutFilter = (this.filters.value.statut || '') as string;

        const filtered = items.filter(r =>
          (dateFilter ? r.date === dateFilter : true) &&
          (statutFilter ? r.statut === statutFilter : true)
        );

        const mapped = filtered
          .map(r => {
            const dateLabel = this.formatFr(r.date);
            const duree = (r as any).serviceDureeMin ?? 60;
            const heureFin = this.addMinutes(r.date, r.heure, duree);
            const badgeClass = this.badgeClass(r.statut);
            const serviceLabel = (r as any).serviceNom ?? 'Prestation';
            const prestataireLabel = (r as any).prestataireNom ?? `Prestataire #${r.prestataireId}`;
            return { ...r, dateLabel, heureFin, badgeClass, serviceLabel, prestataireLabel } as RowVM;
          })
          .sort((a,b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));

        const now = new Date();
        const todayStr = now.toISOString().slice(0,10);
        const nowHm = now.toTimeString().slice(0,5);

        const futurs: RowVM[] = [];
        const passes: RowVM[] = [];

        for (const r of mapped) {
          if (r.date > todayStr || (r.date === todayStr && r.heure >= nowHm)) futurs.push(r);
          else passes.push(r);
        }

        this.rdvs = mapped;
        this.futurs = futurs;
        this.passes = passes;
        this.loadingRdv = false;
      },
      error: () => {
        this.loadingRdv = false;
        this.listError = 'Impossible de charger les rendez-vous.';
      }
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


  formatFr(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00');
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(d);
  }
  addMinutes(dateISO: string, hhmm: string, minutes: number): string {
    const [H,M] = hhmm.split(':').map(Number);
    const d = new Date(dateISO + 'T00:00:00'); d.setHours(H, M + minutes, 0, 0);
    const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  badgeClass(s: Rdv['statut'] | string) {
    switch (s as string) {
      case 'EN_ATTENTE': return 'bg-amber-100 text-amber-900';
      case 'CONFIRME':   return 'bg-emerald-100 text-emerald-900';
      case 'ANNULE':     return 'bg-gray-200 text-gray-700';
      case 'REFUSE':     return 'bg-rose-100 text-rose-900';
      default:           return '';
    }
  }
  labelStatut(s: Rdv['statut'] | string) {
    return (s as string) === 'EN_ATTENTE' ? 'En attente'
         : (s as string) === 'CONFIRME'   ? 'Confirmé'
         : (s as string) === 'ANNULE'     ? 'Annulé'
         : (s as string) === 'REFUSE'     ? 'Refusé'
         : (s as string);
  }
  private toDateTime(r: RowVM): Date {
    const [h,m] = r.heure.split(':').map(Number);
    const d = new Date(r.date + 'T00:00:00'); d.setHours(h, m, 0, 0);
    return d;
  }
  private isSameDay(a: Date, b: Date){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  private isTomorrow(d: Date, now=new Date()){ const t=new Date(now); t.setDate(now.getDate()+1); return this.isSameDay(d,t); }
  estPasse(r: RowVM): boolean { return this.toDateTime(r).getTime() < Date.now(); }
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

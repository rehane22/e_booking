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
  template: `
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Mon compte</h1>
      <a class="btn-ghost h-10" routerLink="/services">← Catalogue</a>
    </div>

    <!-- ======= INFOS PERSONNELLES ======= -->
    <section class="card p-6 mt-6">
      <h2 class="text-lg font-semibold">Informations personnelles</h2>
      <p class="text-sm text-muted mb-4">Modifie tes informations (l’email n’est pas modifiable).</p>

      <form class="grid md:grid-cols-2 gap-4" (ngSubmit)="save()" autocomplete="off">
        <div>
          <label class="text-xs">Prénom</label>
          <input class="input h-10 w-full" [(ngModel)]="form.prenom" name="prenom" required>
        </div>
        <div>
          <label class="text-xs">Nom</label>
          <input class="input h-10 w-full" [(ngModel)]="form.nom" name="nom" required>
        </div>
        <div>
          <label class="text-xs">Téléphone</label>
          <input class="input h-10 w-full" [(ngModel)]="form.telephone" name="telephone" placeholder="+336...">
        </div>
        <div>
          <label class="text-xs">Email</label>
          <input class="input h-10 w-full opacity-70 pointer-events-none" [value]="me?.email" disabled>
        </div>

        <div class="md:col-span-2 flex gap-2 mt-2">
          <button class="btn-primary h-11 px-6" type="submit" [disabled]="saving">
            @if (!saving) { Enregistrer } @else { <span class="opacity-80">Enregistrement…</span> }
          </button>
          <button type="button" class="btn-ghost h-11" (click)="reset()" [disabled]="saving">Réinitialiser</button>
        </div>

        @if (saveError) {
          <div class="md:col-span-2 text-sm text-red-600 mt-2">{{ saveError }}</div>
        }
        @if (saveOk) {
          <div class="md:col-span-2 text-sm text-emerald-600 mt-2">Profil mis à jour.</div>
        }
      </form>
    </section>

    <!-- ======= MES RENDEZ-VOUS (style aligné sur la page pro) ======= -->
    @if (!has('ADMIN')) {
      <section class="card p-6 mt-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Mes rendez-vous</h2>
          <div class="text-sm text-muted">
            @if (rdvs.length) { {{ rdvs.length }} RDV } @else { Aucun RDV }
          </div>
        </div>

        <!-- Filtres -->
        <form [formGroup]="filters" (ngSubmit)="apply()" class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="text-xs">Date</label>
            <input type="date" class="input" formControlName="date">
          </div>
          <div>
            <label class="text-xs">Statut</label>
            <select class="input" formControlName="statut">
              <option [ngValue]="''">Tous</option>
              <option [ngValue]="'EN_ATTENTE'">En attente</option>
              <option [ngValue]="'CONFIRME'">Confirmé</option>
              <option [ngValue]="'ANNULE'">Annulé</option>
              <option [ngValue]="'REFUSE'">Refusé</option>
            </select>
          </div>
          <button class="btn-ghost h-10" type="submit">Filtrer</button>
          <button class="btn-ghost h-10" type="button" (click)="clear()">Réinitialiser</button>
        </form>

        <!-- À venir -->
        <div class="p-6 rounded-2xl border border-black/10">
          <h3 class="font-semibold mb-3">À venir</h3>
          <div class="space-y-3">
            @for (r of futurs; track r.id) {
              <div class="p-4 rounded-2xl border border-black/10">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="font-medium">
                      {{ r.serviceLabel }}
                    </div>
                    <div class="text-sm text-black/70">
                      {{ r.dateLabel }} — {{ r.heure }} → {{ r.heureFin }} · {{ r.prestataireLabel }}
                    </div>
                    <div class="mt-2 flex items-center gap-2">
                      <span class="badge" [ngClass]="r.badgeClass">{{ labelStatut(r.statut) }}</span>
                      <span class="text-[11px] px-2 py-0.5 rounded-full border"
                            [ngClass]="badgeTempsClasses(r)">
                        {{ badgeTempsLabel(r) }}
                      </span>
                    </div>
                  </div>

                  <div class="flex gap-2 shrink-0">
                    <a class="btn-ghost h-9" [routerLink]="['/prestataires', r.prestataireId]">Voir prestataire</a>
                    @if (r.statut !== 'ANNULE' && r.statut !== 'REFUSE') {
                      <button class="btn-ghost h-9 text-red-600"
                              (click)="cancel(r)"
                              [disabled]="cancelingId === r.id">
                        @if (cancelingId === r.id) { Annulation… } @else { Annuler }
                      </button>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="text-sm text-muted">Aucun rendez-vous à venir.</div>
            }
          </div>
        </div>

        <!-- Passés (repliables) -->
        <div class="p-6 rounded-2xl border border-black/10">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Passés</h3>
            <button class="btn-ghost h-9" (click)="pastOpen=!pastOpen">
              {{ pastOpen ? 'Masquer' : 'Afficher' }}
            </button>
          </div>

          @if (pastOpen) {
            <div class="space-y-3 mt-3">
              @for (r of passes; track r.id) {
                <div class="p-4 rounded-2xl border border-black/10">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="font-medium">{{ r.serviceLabel }}</div>
                      <div class="text-sm text-black/70">
                        {{ r.dateLabel }} — {{ r.heure }} → {{ r.heureFin }} · {{ r.prestataireLabel }}
                      </div>
                      <div class="mt-2">
                        <span class="badge" [ngClass]="r.badgeClass">{{ labelStatut(r.statut) }}</span>
                      </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                      <a class="btn-ghost h-9" [routerLink]="['/prestataires', r.prestataireId]">Voir prestataire</a>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="text-sm text-muted">Aucun historique.</div>
              }
            </div>
          }
        </div>

        @if (listError) {
          <div class="text-sm text-red-600">{{ listError }}</div>
        }
      </section>
    }
  </div>
  `
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

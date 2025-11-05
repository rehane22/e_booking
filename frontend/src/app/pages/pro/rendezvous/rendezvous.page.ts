import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RendezVousApi, Rdv, RdvStatut } from '../../../core/api/rendezvous.api';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';

type RowVM = Rdv & { // VM: formatages UI
  dateLabel: string;
  heureFin: string;
  badgeClass: string;
};

@Component({
  standalone: true,
  imports:[CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  template: `
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Mes rendez-vous pros</h1>
      <button routerLink="/pro" class="btn-ghost h-10">← Dashboard</button>
    </div>

    <!-- Filtres -->
    <form [formGroup]="filters" (ngSubmit)="apply()" class="card p-6 flex flex-wrap gap-3 items-end">
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
    <div class="card p-6">
      <h3 class="font-semibold mb-3">À venir</h3>
      <div class="space-y-3">
        @for (r of futurs; track r.id) {
          <div class="p-4 rounded-2xl border border-black/10">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium">{{ r.serviceNom }}</div>
                <div class="text-sm text-black/70">
                  {{ r.dateLabel }} — {{ r.heure }} → {{ r.heureFin }} · {{ r.clientNom }}
                </div>
                <span class="badge mt-2" [ngClass]="r.badgeClass">{{ labelStatut(r.statut) }}</span>
              </div>

              <!-- Actions contextuelles -->
              <div class="flex gap-2 shrink-0">
                <!-- Confirmer uniquement si EN_ATTENTE -->
                @if (r.statut === 'EN_ATTENTE') {
                  <button class="btn-ghost h-9" (click)="confirmer(r)">Confirmer</button>
                }

                <!-- Refuser (PRO) si non annulé/refusé -->
                @if (r.statut !== 'ANNULE' && r.statut !== 'REFUSE') {
                  <button class="btn-ghost h-9 text-red-600" (click)="refuser(r)">Refuser</button>
                }

                <!-- Modifier si non annulé/refusé -->
                @if (r.statut !== 'ANNULE' && r.statut !== 'REFUSE') {
                  <button class="btn-ghost h-9" (click)="toggleEdit(r)">Modifier</button>
                }
              </div>
            </div>

            <!-- Panneau édition -->
            @if (editingId===r.id) {
              <form class="mt-3 grid sm:grid-cols-5 gap-3 items-end" (ngSubmit)="saveEdit(r)">
                <div class="sm:col-span-2">
                  <label class="text-xs">Date</label>
                  <input class="input" type="date" [(ngModel)]="edit.date" name="date">
                </div>
                <div class="">
                  <label class="text-xs">Heure</label>
                  <input class="input" type="time" [(ngModel)]="edit.heure" name="heure">
                </div>
                <div class="sm:col-span-2">
                  <label class="text-xs">Service</label>
                  <select class="input" [(ngModel)]="edit.serviceId" name="serviceId">
                    <option *ngFor="let s of services" [ngValue]="s.id">{{ s.nom }}</option>
                  </select>
                </div>
                <div class="sm:col-span-5 flex gap-2">
                  <button class="btn-primary h-10" type="submit" [disabled]="!canSaveEdit()">Enregistrer</button>
                  <button class="btn-ghost h-10" type="button" (click)="cancelEdit()">Annuler</button>
                </div>
              </form>
            }
          </div>
        } @empty {
          <div class="text-sm text-muted">Aucun rendez-vous à venir.</div>
        }
      </div>
    </div>

    <!-- Passés (repliables) -->
    <div class="card p-6">
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
                  <div class="font-medium">{{ r.serviceNom }}</div>
                  <div class="text-sm text-black/70">
                    {{ r.dateLabel }} — {{ r.heure }} → {{ r.heureFin }} · {{ r.clientNom }}
                  </div>
                  <span class="badge mt-2" [ngClass]="r.badgeClass">{{ labelStatut(r.statut) }}</span>
                </div>
              </div>
            </div>
          } @empty {
            <div class="text-sm text-muted">Aucun historique.</div>
          }
        </div>
      }
    </div>
  </div>
  `
})
export class RendezvousPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(RendezVousApi);
  private proApi = inject(PrestataireApi);

  me!: PrestataireMe;
  services: { id: number|string; nom: string; dureeMin?: number }[] = [];

  filters = this.fb.group({ date: [''], statut: [''] });

  rdvs: RowVM[] = [];
  futurs: RowVM[] = [];
  passes: RowVM[] = [];
  pastOpen = false;

  // edition inline
  editingId: string|number|null = null;
  edit: { date: string; heure: string; serviceId: number|string|null } = { date: '', heure: '', serviceId: null };

  ngOnInit() {
    this.proApi.me().subscribe(me => {
      this.me = me;
      this.services = (me.services || []).map((s: any) => ({ id: s.id, nom: s.nom, dureeMin: s.dureeMin }));
      this.load();
    });
  }

  apply() { this.load(); }
  clear() { this.filters.reset({ date: '', statut: '' }); this.load(); }

  load() {
    const qDate = this.filters.value.date || undefined;
    this.api.listByPrestataire(this.me.id, qDate as string|undefined).subscribe(list => {
      // map → VM + format FR + heure fin
      const now = new Date();
      const todayStr = now.toISOString().slice(0,10);

      const mapped: RowVM[] = list
        .filter(r => this.filters.value.statut ? r.statut === this.filters.value.statut : true)
        .map(r => {
          const dateLabel = this.formatFr(r.date);
          const duree = r.serviceDureeMin ?? this.serviceDuration(r.serviceId) ?? 60;
          const heureFin = this.addMinutes(r.date, r.heure, duree);
          return { ...r, dateLabel, heureFin, badgeClass: this.badgeClass(r.statut) };
        })
        // tri: d'abord date croissante + heure croissante
        .sort((a,b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));

      // split futurs / passés
      const [fut, pas] = [[], []] as [RowVM[], RowVM[]];
      for (const r of mapped) {
        if (r.date > todayStr || (r.date === todayStr && r.heure >= now.toTimeString().slice(0,5))) fut.push(r);
        else pas.push(r);
      }
      this.rdvs = mapped;
      this.futurs = fut;
      this.passes = pas;
    });
  }

  /* -------- Actions -------- */
  confirmer(r: RowVM) {
    this.api.confirmer(r.id).subscribe({
      next: nr => { r.statut = nr.statut; r.badgeClass = this.badgeClass(r.statut); this.load(); },
      error: e => alert('Confirmation impossible: ' + (e.error?.message ?? e.status))
    });
  }

  refuser(r: RowVM) {
    if (!confirm('Refuser ce rendez-vous ? Le créneau sera libéré.')) return;
    this.api.refuser(r.id).subscribe({
      next: nr => { r.statut = nr.statut; r.badgeClass = this.badgeClass(r.statut); this.load(); },
      error: e => alert('Refus impossible: ' + (e.error?.message ?? e.status))
    });
  }

  toggleEdit(r: RowVM) {
    if (this.editingId === r.id) return this.cancelEdit();
    this.editingId = r.id;
    this.edit = { date: r.date, heure: r.heure, serviceId: r.serviceId };
  }
  canSaveEdit() {
    return !!this.edit.date && !!this.edit.heure && !!this.edit.serviceId;
  }
  saveEdit(r: RowVM) {
    if (!this.canSaveEdit()) return;
    this.api.modifier(r.id, {
      date: this.edit.date,
      heure: this.edit.heure,
      serviceId: this.edit.serviceId!
    }).subscribe({
      next: nr => { this.cancelEdit(); this.load(); },
      error: e => alert('Modification impossible: ' + (e.error?.message ?? e.status))
    });
  }
  cancelEdit() { this.editingId = null; this.edit = { date: '', heure: '', serviceId: null }; }

  /* -------- Helpers -------- */
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
  serviceDuration(serviceId: number|string) {
    return this.services.find(s => s.id === serviceId)?.dureeMin;
  }
  badgeClass(statut: RdvStatut) {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-amber-100 text-amber-900';
      case 'CONFIRME':   return 'bg-emerald-100 text-emerald-900';
      case 'ANNULE':     return 'bg-gray-200 text-gray-700';
      case 'REFUSE':     return 'bg-rose-100 text-rose-900';
      default:           return '';
    }
  }
  labelStatut(s: RdvStatut) {
    return s === 'EN_ATTENTE' ? 'En attente'
         : s === 'CONFIRME'   ? 'Confirmé'
         : s === 'ANNULE'     ? 'Annulé'
         : s === 'REFUSE'     ? 'Refusé'
         : s;
  }
}

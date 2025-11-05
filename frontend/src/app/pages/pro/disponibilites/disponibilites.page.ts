import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DisponibiliteApi, Disponibilite } from '../../../core/api/disponibilite.api';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';

type ServiceLight = { id: string|number; nom: string };

// Enum jour côté front, en phase avec l'enum Java (STRING)
const JOUR_ENUMS = ['LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI','DIMANCHE'] as const;
type JourEnum = typeof JOUR_ENUMS[number];

@Component({
  standalone: true,
  imports:[CommonModule, RouterModule, ReactiveFormsModule],
  template: `
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Mes disponibilités</h1>
      <button type="button" routerLink="/pro" class="btn-ghost h-10">← Dashboard</button>
    </div>

    <!-- ====== FORM CRÉATION ====== -->
    <form [formGroup]="form" (ngSubmit)="add()" class="card p-6 grid lg:grid-cols-6 gap-3 items-end">
      <div class="lg:col-span-2">
        <label class="text-xs">Jour</label>
        <select class="input" formControlName="jourSemaine">
          @for (j of jours; track j) {
            <option [ngValue]="j">{{ labelJour(j) }}</option>
          } @empty {}
        </select>
      </div>
      <div>
        <label class="text-xs">Début</label>
        <input class="input" type="time" formControlName="heureDebut" (change)="onDebutChange(form)">
      </div>
      <div>
        <label class="text-xs">Fin</label>
        <input class="input" type="time" formControlName="heureFin">
      </div>
      <div class="lg:col-span-2">
        <label class="text-xs">Service (optionnel)</label>
        <select class="input" formControlName="serviceId">
          <option [ngValue]="null">Aucun (tous services)</option>
          @for (s of linkedServices; track s.id) {
            <option [ngValue]="s.id">{{ s.nom }}</option>
          } @empty {}
        </select>
      </div>
      <button class="btn-primary h-11 w-full lg:w-auto"
              type="submit"
              [disabled]="form.invalid || !timeOk(form)">
        Ajouter
      </button>

      <div class="lg:col-span-6 text-xs text-red-600" *ngIf="form.touched && !timeOk(form)">
        L’heure de début doit être strictement inférieure à l’heure de fin.
      </div>
    </form>

    <!-- ====== LISTE GROUPÉE PAR JOUR ====== -->
    <div class="card p-6">
      @for (j of jours; track j) {
        <h3 class="mt-2 mb-3 font-medium text-sm uppercase text-black/70">{{ labelJour(j) }}</h3>
        <div class="grid lg:grid-cols-2 gap-3">
          @for (d of disposByDay(j); track d.id) {
            <div class="p-3 rounded-2xl border transition-all"
                 [class]="editingId===d.id ? 'border-primary ring-2 ring-primary/20' : 'border-black/10'">

              <!-- LIGNE COMPACTE -->
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm">
                  <b>{{ d.heureDebut }} → {{ d.heureFin }}</b>
                  <span class="badge ml-2">{{ d.serviceId ? nomService(d.serviceId) : 'Tous services' }}</span>
                </div>
                <div class="flex gap-2 shrink-0">
                  <button class="btn-ghost h-9" (click)="editingId===d.id ? cancelEdit() : startEdit(d)">
                    {{ editingId===d.id ? 'Fermer' : 'Modifier' }}
                  </button>
                  <button class="btn-ghost h-9" (click)="duplicate(d)">Dupliquer</button>
                  <button class="btn-ghost h-9 text-red-600" (click)="remove(d)">Supprimer</button>
                </div>
              </div>

              <!-- PANNEAU ÉDITION (ANIMÉ) -->
              <div class="mt-3 overflow-hidden transition-[max-height] duration-300"
                   [style.maxHeight]="editingId===d.id ? '260px' : '0'">
                <form [formGroup]="editForm" (ngSubmit)="saveEdit(d)"
                      class="mt-3 grid md:grid-cols-5 gap-3 items-end">
                  <div>
                    <label class="text-xs">Jour</label>
                    <select class="input" formControlName="jourSemaine">
                      @for (jj of jours; track jj) {
                        <option [ngValue]="jj">{{ labelJour(jj) }}</option>
                      } @empty {}
                    </select>
                  </div>
                  <div>
                    <label class="text-xs">Début</label>
                    <input class="input" type="time" formControlName="heureDebut" (change)="onDebutChange(editForm)">
                  </div>
                  <div>
                    <label class="text-xs">Fin</label>
                    <input class="input" type="time" formControlName="heureFin">
                  </div>
                  <div class="md:col-span-2">
                    <label class="text-xs">Service (optionnel)</label>
                    <select class="input" formControlName="serviceId">
                      <option [ngValue]="null">Aucun (tous services)</option>
                      @for (s of linkedServices; track s.id) {
                        <option [ngValue]="s.id">{{ s.nom }}</option>
                      } @empty {}
                    </select>
                  </div>
                  <div class="md:col-span-5 flex gap-2">
                    <button class="btn-primary h-10" type="submit" [disabled]="editForm.invalid || !timeOk(editForm)">
                      Enregistrer
                    </button>
                    <button class="btn-ghost h-10" type="button" (click)="cancelEdit()">Annuler</button>
                  </div>
                  <div class="md:col-span-5 text-xs text-red-600" *ngIf="editForm.touched && !timeOk(editForm)">
                    L’heure de début doit être strictement inférieure à l’heure de fin.
                  </div>
                </form>
              </div>
            </div>
          } @empty {
            <div class="text-xs text-muted">Aucune disponibilité ce jour.</div>
          }
        </div>
      }
    </div>
  </div>
  `
})
export class DisponibilitesPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(DisponibiliteApi);
  private proApi = inject(PrestataireApi);

  jours: JourEnum[] = [...JOUR_ENUMS];
  me!: PrestataireMe;
  linkedServices: ServiceLight[] = [];
  dispos: Disponibilite[] = [];

  // création
  form: FormGroup = this.fb.group({
    jourSemaine: ['LUNDI', Validators.required],
    heureDebut: ['09:00', Validators.required],
    heureFin: ['17:00', Validators.required],
    serviceId: [null], // null = aucun
  });

  // édition inline
  editingId: string|number|null = null;
  editForm: FormGroup = this.fb.group({
    jourSemaine: ['LUNDI', Validators.required],
    heureDebut: ['09:00', Validators.required],
    heureFin: ['17:00', Validators.required],
    serviceId: [null],
  });

  ngOnInit() {
    this.proApi.me().subscribe(me => {
      this.me = me;
      // Services liés du prestataire → pour le select
      const raw = (me.services ?? []) as any[];
      this.linkedServices = raw.map(s => ({ id: s.id, nom: s.nom })) as ServiceLight[];
      this.load();
    });
  }

  load() { this.api.listByPrestataire(this.me.id).subscribe(list => this.dispos = list); }

  // Helpers UX
  labelJour(j: JourEnum) {
    const labels: Record<JourEnum,string> = {
      LUNDI:'Lundi', MARDI:'Mardi', MERCREDI:'Mercredi', JEUDI:'Jeudi',
      VENDREDI:'Vendredi', SAMEDI:'Samedi', DIMANCHE:'Dimanche'
    };
    return labels[j];
  }

  timeOk(f: FormGroup): boolean {
    const d = f.value.heureDebut as string, fin = f.value.heureFin as string;
    return !!d && !!fin && d < fin;
  }

  onDebutChange(f: FormGroup) {
    const d = f.value.heureDebut as string;
    const fin = f.value.heureFin as string;
    if (!d) return;
    if (!fin || fin <= d) {
      const [H,M] = d.split(':').map(Number);
      const date = new Date(0,0,0,H,M);
      date.setMinutes(date.getMinutes() + 60); // +1h par défaut
      const hh = String(date.getHours()).padStart(2,'0');
      const mm = String(date.getMinutes()).padStart(2,'0');
      f.patchValue({ heureFin: `${hh}:${mm}` }, { emitEvent:false });
    }
  }

  add() {
    if (!this.timeOk(this.form)) return;
    const v = this.form.value;
    this.api.create({
      prestataireId: this.me.id,
      jourSemaine: v.jourSemaine as JourEnum,
      heureDebut: v.heureDebut!,
      heureFin: v.heureFin!,
      serviceId: v.serviceId ?? null
    }).subscribe({
      next: () => { this.form.patchValue({ heureDebut: '09:00', heureFin: '17:00', serviceId: null }); this.load(); },
      error: (e) => alert('Création impossible: ' + (e.error?.message ?? e.status))
    });
  }

  startEdit(d: Disponibilite) {
    this.editingId = d.id;
    this.editForm.setValue({
      jourSemaine: d.jourSemaine as any,   // ex: "LUNDI"
      heureDebut: d.heureDebut,
      heureFin: d.heureFin,
      serviceId: d.serviceId ?? null
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.editForm.reset({ jourSemaine: 'LUNDI', heureDebut: '09:00', heureFin: '17:00', serviceId: null });
  }

  saveEdit(d: Disponibilite) {
    if (!this.timeOk(this.editForm)) return;
    const v = this.editForm.value;
    this.api.update(d.id, {
      jourSemaine: v.jourSemaine as JourEnum,
      heureDebut: v.heureDebut!,
      heureFin: v.heureFin!,
      serviceId: v.serviceId ?? null
    }).subscribe({
      next: () => { this.cancelEdit(); this.load(); },
      error: (e) => alert('Mise à jour impossible: ' + (e.error?.message ?? e.status))
    });
  }

  remove(d: Disponibilite) {
    if (!confirm('Supprimer ce créneau ?')) return;
    this.api.remove(d.id).subscribe({
      next: () => this.load(),
      error: (e) => alert('Suppression impossible: ' + (e.error?.message ?? e.status))
    });
  }

  // Groupement par jour
  disposByDay(j: JourEnum) {
    return this.dispos.filter(x => x.jourSemaine === j);
  }

  nomService(id: string|number) {
    return this.linkedServices.find(s => s.id === id)?.nom ?? `#${id}`;
  }

  duplicate(d: Disponibilite) {
    this.form.setValue({
      jourSemaine: d.jourSemaine as any,
      heureDebut: d.heureDebut,
      heureFin: d.heureFin,
      serviceId: d.serviceId ?? null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
} 
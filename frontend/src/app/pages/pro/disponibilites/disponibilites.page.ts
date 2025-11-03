import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DisponibiliteApi, Disponibilite } from '../../../core/api/disponibilite.api';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';

type ServiceLight = { id: string|number; nom: string };

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
          <option [ngValue]="0">Lundi</option><option [ngValue]="1">Mardi</option>
          <option [ngValue]="2">Mercredi</option><option [ngValue]="3">Jeudi</option>
          <option [ngValue]="4">Vendredi</option><option [ngValue]="5">Samedi</option>
          <option [ngValue]="6">Dimanche</option>
        </select>
      </div>
      <div>
        <label class="text-xs">Début</label>
        <input class="input" type="time" formControlName="heureDebut">
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
    </form>

    <!-- ====== LISTE ====== -->
    <div class="card p-6">
      <div class="grid lg:grid-cols-2 gap-3">
        @for (d of dispos; track d.id) {
          <div class="p-3 rounded-2xl border transition-all"
               [class]="editingId===d.id ? 'border-primary ring-2 ring-primary/20' : 'border-black/10'">

            <!-- LIGNE COMPACTE -->
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm">
                <b>{{ jour(d.jourSemaine) }}</b> · {{ d.heureDebut }} → {{ d.heureFin }}
                @if (d.serviceId) {
                  <span class="badge ml-2">{{ nomService(d.serviceId) }}</span>
                } @else {
                  <span class="badge ml-2">Tous services</span>
                }
              </div>
              <div class="flex gap-2 shrink-0">
                @if (editingId!==d.id) {
                  <button class="btn-ghost h-9" (click)="startEdit(d)">Modifier</button>
                } @else {
                  <button class="btn-ghost h-9" (click)="cancelEdit()">Annuler</button>
                }
                <button class="btn-ghost h-9" (click)="remove(d)">Supprimer</button>
              </div>
            </div>

            <!-- PANNEAU ÉDITION (EXPANSION) -->
            @if (editingId===d.id) {
              <form [formGroup]="editForm" (ngSubmit)="saveEdit(d)"
                    class="mt-3 grid md:grid-cols-5 gap-3 items-end">
                <div>
                  <label class="text-xs">Jour</label>
                  <select class="input" formControlName="jourSemaine">
                    <option [ngValue]="0">Lundi</option><option [ngValue]="1">Mardi</option>
                    <option [ngValue]="2">Mercredi</option><option [ngValue]="3">Jeudi</option>
                    <option [ngValue]="4">Vendredi</option><option [ngValue]="5">Samedi</option>
                    <option [ngValue]="6">Dimanche</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs">Début</label>
                  <input class="input" type="time" formControlName="heureDebut">
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
              </form>
            }
          </div>
        } @empty {
          <div class="text-sm text-muted">Aucune disponibilité.</div>
        }
      </div>
    </div>
  </div>
  `
})
export class DisponibilitesPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(DisponibiliteApi);
  private proApi = inject(PrestataireApi);

  me!: PrestataireMe;
  linkedServices: ServiceLight[] = [];
  dispos: Disponibilite[] = [];

  // création
  form: FormGroup = this.fb.group({
    jourSemaine: [1, Validators.required],
    heureDebut: ['09:00', Validators.required],
    heureFin: ['17:00', Validators.required],
    serviceId: [null], // null = aucun
  });

  // édition inline
  editingId: string|number|null = null;
  editForm: FormGroup = this.fb.group({
    jourSemaine: [1, Validators.required],
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

  timeOk(f: FormGroup): boolean {
    const d = f.value.heureDebut as string, fin = f.value.heureFin as string;
    return !!d && !!fin && d < fin;
  }

  add() {
    if (!this.timeOk(this.form)) return alert('Heure début < fin');
    const v = this.form.value;
    this.api.create({
      prestataireId: this.me.id,
      jourSemaine: v.jourSemaine!,
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
      jourSemaine: d.jourSemaine,
      heureDebut: d.heureDebut,
      heureFin: d.heureFin,
      serviceId: d.serviceId ?? null
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.editForm.reset({ jourSemaine: 1, heureDebut: '09:00', heureFin: '17:00', serviceId: null });
  }

  saveEdit(d: Disponibilite) {
    if (!this.timeOk(this.editForm)) return alert('Heure début < fin');
    const v = this.editForm.value;
    this.api.update(d.id, {
      jourSemaine: v.jourSemaine!,
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

  jour(n: number) {
    return ['','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][n] ?? n;
  }

  nomService(id: string|number) {
    return this.linkedServices.find(s => s.id === id)?.nom ?? `#${id}`;
    // si ton back renvoie directement le nom, remplace par d.serviceNom côté template
  }
}

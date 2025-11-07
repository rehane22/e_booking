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
  templateUrl: './disponibilites.page.html',
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
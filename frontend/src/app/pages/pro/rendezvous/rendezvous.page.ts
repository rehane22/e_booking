import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true, imports:[CommonModule, ReactiveFormsModule,RouterModule],
  template: `
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Mes RDV</h1>
      <button routerLink="/pro" class="btn-ghost h-10">← Dashboard</button>
    </div>

    <form [formGroup]="filters" (ngSubmit)="apply()" class="card p-6 flex flex-wrap gap-3 items-end">
      <div>
        <label class="text-xs">Date</label>
        <input type="date" class="input" formControlName="date">
      </div>
      <button class="btn-ghost h-10" type="submit">Filtrer</button>
      <button class="btn-ghost h-10" type="button" (click)="clear()">Reset</button>
    </form>

    <div class="space-y-3">
      @for (r of rdvs; track r.id) {
        <div class="card p-5 flex items-center justify-between">
          <div>
            <p class="font-semibold">{{ r.serviceNom }}</p>
            <p class="text-xs text-muted">{{ r.date }} · {{ r.heure }} — {{ r.clientNom }}</p>
            <span class="badge mt-2">{{ r.statut }}</span>
          </div>
          <div class="flex gap-2">
            @if (r.statut !== 'CONFIRME') { <button class="btn-ghost h-10" (click)="confirmer(r)">Confirmer</button> }
            @if (r.statut !== 'ANNULE')   { <button class="btn-ghost h-10" (click)="annuler(r)">Annuler</button> }
          </div>
        </div>
      } @empty { <div class="text-sm text-muted">Aucun rendez-vous.</div> }
    </div>
  </div>
  `
})
export class RendezvousPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(RendezVousApi);
  private proApi = inject(PrestataireApi);

  me!: PrestataireMe;
  rdvs: Rdv[] = [];
  filters = this.fb.group({ date: [''] });

  ngOnInit() { this.proApi.me().subscribe(me => { this.me = me; this.load(); }); }

  load() {
    const d = this.filters.value.date || undefined;
    this.api.listByPrestataire(this.me.id, d as string | undefined).subscribe(list => this.rdvs = list);
  }
  apply() { this.load(); }
  clear() { this.filters.reset({ date: '' }); this.load(); }

  confirmer(r: Rdv) {
    this.api.confirmer(r.id).subscribe({
      next: (nr) => r.statut = nr.statut,
      error: (e) => alert('Confirmation impossible: ' + (e.error?.message ?? e.status))
    });
  }
  annuler(r: Rdv) {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    this.api.annuler(r.id).subscribe({
      next: (nr) => r.statut = nr.statut,
      error: (e) => alert('Annulation impossible: ' + (e.error?.message ?? e.status))
    });
  }
}

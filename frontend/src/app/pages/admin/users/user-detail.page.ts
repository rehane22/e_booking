// src/app/pages/admin/users/user-detail.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AdminUserApi, AdminUserDetail } from '../../../core/api/admin-user.api';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="max-w-5xl mx-auto space-y-6">
  <div class="flex items-center justify-between mt-4">

  
  
  <div class="flex gap-2">
    @if (user && user.statut !== 'ACTIF') {
      <button class="btn-primary h-10" (click)="activate()">Activer</button>
    }
    @if (user && user.statut !== 'BLOQUE') {
      <button class="btn-rose-card h-10" (click)="block()">Bloquer</button>
    }
  </div>
  <a class="btn-ghost h-10" routerLink="/admin/users">← Tables Utilisateurs</a>
      </div>
        
    @if (user) {
      <div class="card p-6">
        <div class="grid sm:grid-cols-2 gap-4">
          <p><b>Nom:</b> {{ user.prenom }} {{ user.nom }}</p>
          <p><b>Email:</b> {{ user.email }}</p>
          <p><b>Téléphone:</b> {{ user.telephone || '—' }}</p>
          <p><b>Rôles:</b> {{ user.roles.join(', ') }}</p>
          <p><b>Statut:</b>
            <span [ngClass]="statusBadge(user.statut)">{{ user.statut }}</span>
          </p>

        </div>
      </div>


      <div class="card p-6">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Rendez-vous ({{ rdvs.length }})</h3>
  
        </div>
        <div class="divide-y mt-3">
          @for (r of rdvs; track r.id) {
            <div class="py-3 flex items-center justify-between">
              <div class="text-sm">
                <div class="font-medium">{{ r.date }} • {{ r.heure }} → {{ r.heure }}</div>
                <div class="text-muted">Prestataire #{{ r.prestataireId }} • Service #{{ r.serviceId }}</div>
              </div>
              <span class="badge" [ngClass]="rdvBadge(r.statut)">{{ r.statut }}</span>
            </div>
          }
          @empty {
            <div class="py-6 text-center text-muted text-sm">Aucun rendez-vous</div>
          }
        </div>
      </div>
    } @else {
      <div class="text-center text-muted mt-10">Chargement…</div>
    }
  </div>
  `
})
export class UserDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AdminUserApi);
  private rdvApi = inject(RendezVousApi);

  id!: number;
  user?: AdminUserDetail;
  rdvs: Rdv[] = [];

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get(this.id).subscribe(u => this.user = u);
    // Si côté back, on a une route admin dédiée c'est mieux; sinon on peut réutiliser liste client.
    this.rdvApi.listByClient(this.id).subscribe(list => this.rdvs = list);
  }

  activate() {
    if (!this.user) return;
    if (!confirm(`Activer le compte de ${this.user.prenom} ${this.user.nom} ?`)) return;
    this.api.activate(this.user.id).subscribe(() => this.api.get(this.id).subscribe(u => this.user = u));
  }

  block() {
    if (!this.user) return;
    if (!confirm(`Bloquer le compte de ${this.user.prenom} ${this.user.nom} ?`)) return;
    this.api.block(this.user.id).subscribe(() => this.api.get(this.id).subscribe(u => this.user = u));
  }

  statusBadge(statut: string) {
    return {
      'badge px-2 py-1 rounded-lg text-xs': true,
      'bg-green-100 text-green-700': statut === 'ACTIF',
      'bg-rose-100 text-rose-700': statut === 'BLOQUE',
    };
  }

  rdvBadge(s: string) {
    return {
      'badge px-2 py-1 rounded-lg text-xs': true,
      'bg-green-100 text-green-700': s === 'CONFIRME' || s === 'CONFIRMÉ',
      'bg-rose-100 text-rose-700': s === 'ANNULE' || s === 'ANNULÉ',
    };
  }
}

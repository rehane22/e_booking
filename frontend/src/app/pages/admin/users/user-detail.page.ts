import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminUserApi, AdminUserDetail } from '../../../core/api/admin-user.api';
import { UsersApi, UpdateUserPayload } from '../../../core/api/users.api';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
      <a class="btn-ghost h-10" routerLink="/admin/users">← Tableau Utilisateurs</a>
    </div>

    @if (user) {
      <!-- Fiche + édition -->
      <div class="card p-6 space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          <p><b>Email:</b> {{ user.email }}</p>
          <p><b>Rôles:</b> {{ user.roles.join(', ') }}</p>
          <p><b>Statut:</b> <span [ngClass]="statusBadge(user.statut)">{{ user.statut }}</span></p>
          <p><b>ID:</b> {{ user.id }}</p>
        </div>

        <hr class="border-black/10">

        <form class="grid sm:grid-cols-2 gap-4" (ngSubmit)="save()">
          <div>
            <label class="text-xs">Prénom</label>
            <input class="input h-10 w-full" [(ngModel)]="form.prenom" name="prenom" required>
          </div>
          <div>
            <label class="text-xs">Nom</label>
            <input class="input h-10 w-full" [(ngModel)]="form.nom" name="nom" required>
          </div>
          <div class="sm:col-span-2">
            <label class="text-xs">Téléphone</label>
            <input class="input h-10 w-full" [(ngModel)]="form.telephone" name="telephone" placeholder="+336...">
          </div>

          <div class="sm:col-span-2 flex items-center gap-2">
            <button class="btn-primary h-10 px-6" type="submit" [disabled]="saving">
              @if (!saving) { Enregistrer } @else { <span class="opacity-80">Enregistrement…</span> }
            </button>

            <button type="button" class="btn-rose-card h-10" (click)="deleteUser()" [disabled]="deleting">
              @if (!deleting) { Supprimer l’utilisateur } @else { Suppression… }
            </button>

            @if (saveOk) { <span class="text-sm text-emerald-600">Modifications enregistrées.</span> }
            @if (saveError) { <span class="text-sm text-red-600">{{ saveError }}</span> }
          </div>
        </form>
      </div>

      <!-- RDVs -->
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Rendez-vous ({{ rdvs.length }})</h3>
        </div>
        <div class="divide-y mt-3">
          @for (r of rdvs; track r.id) {
            <div class="py-3 flex items-center justify-between">
              <div class="text-sm">
                <div class="font-medium">{{ r.date }} • {{ r.heure }}</div>
                <div class="text-muted">Prestataire #{{ r.prestataireId }} • Service #{{ r.serviceId }}</div>
              </div>
              <span class="badge" [ngClass]="rdvBadge(r.statut)">{{ r.statut }}</span>
            </div>
          } @empty {
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
  private router = inject(Router);
  private adminApi = inject(AdminUserApi); // activer/bloquer si tu gardes ces endpoints
  private usersApi = inject(UsersApi);     // GET/PUT/DELETE /users/{id}
  private rdvApi = inject(RendezVousApi);

  id!: number;
  user?: AdminUserDetail;
  rdvs: Rdv[] = [];

  form = { prenom: '', nom: '', telephone: '' };
  saving = false; deleting = false;
  saveOk = false; saveError = '';

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.reload();
  }

  reload() {
    this.usersApi.getById(this.id).subscribe(u => {
      // `AdminUserDetail` et `UserDetail` sont compatibles ici (id, prenom, nom, email, telephone, statut, roles)
      this.user = u as unknown as AdminUserDetail;
      this.form = { prenom: u.prenom || '', nom: u.nom || '', telephone: u.telephone || '' };
    });
    this.rdvApi.listByClient(this.id).subscribe(list => this.rdvs = list);
  }

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

  rdvBadge(s: string) {
    return {
      'badge px-2 py-1 rounded-lg text-xs': true,
      'bg-green-100 text-green-700': s === 'CONFIRME' || s === 'CONFIRMÉ',
      'bg-rose-100 text-rose-700': s === 'ANNULE' || s === 'ANNULÉ',
    };
  }
}

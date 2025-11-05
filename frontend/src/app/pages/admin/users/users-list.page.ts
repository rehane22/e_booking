// src/app/pages/admin/users/users-list.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminUserApi, AdminUserItem } from '../../../core/api/admin-user.api';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Utilisateurs</h1>
    </div>
    
    <div class="text-sm text-muted">Total: {{ total }}</div>
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="text-left px-4 py-3">Utilisateur</th>
            <th class="text-left px-4 py-3">Email</th>
            <th class="text-left px-4 py-3">Rôles</th>
            <th class="text-left px-4 py-3">Statut</th>
            <th class="text-left px-4 py-3">Créé</th>
            <th class="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (u of items; track u.id) {
            <tr class="border-t">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full text-white flex items-center justify-center"
                       [class]="avatarBg(u.id)">
                    {{ initials(u.prenom + ' ' + u.nom) }}
                  </div>
                  <div>
                    <div class="font-medium">{{ u.prenom }} {{ u.nom }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">{{ u.email }}</td>
              <td class="px-4 py-3">
                @for (r of u.roles; track r) {
                  <span class="badge bg-primary/10 text-primary mr-1">{{ r }}</span>
                }
              </td>
              <td class="px-4 py-3">
                <span [ngClass]="statusBadge(u.statut)">{{ u.statut }}</span>
              </td>
              <td class="px-4 py-3">{{ u.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
              <td class="px-4 py-3 text-right">
                <a class="btn-ghost h-9 mr-2" [routerLink]="['/admin/users', u.id]">Voir</a>
                @if (u.statut !== 'ACTIF') {
                  <button class="btn-primary h-9 mr-2" (click)="activate(u)">Activer</button>
                }
                @if (u.statut !== 'BLOQUE') {
                  <button class="btn-ghost h-9" (click)="block(u)">Bloquer</button>
                }
              </td>
            </tr>
          }
          @empty {
            <tr><td colspan="7" class="px-4 py-6 text-center text-muted">Aucun résultat</td></tr>
          }
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-end">
      
      <div class="flex gap-2">
        <button class="btn-ghost h-9" [disabled]="page===0" (click)="load(page-1)">Précédent</button>
        <button class="btn-ghost h-9" [disabled]="(page+1)*size >= total" (click)="load(page+1)">Suivant</button>
      </div>
    </div>
  </div>
  `
})
export class UsersListPage implements OnInit {
  private api = inject(AdminUserApi);

  items: AdminUserItem[] = [];
  total = 0; page = 0; size = 20;
  query = '';
  status: 'ALL'|'ACTIF'|'BLOQUE' = 'ALL'; // ← renommé
  sort = 'createdAt,DESC';

  ngOnInit() { this.load(0); }

  load(p = 0) {
    this.page = p;
    this.api.list({
      query: this.query,
      status: this.status,   // ← utiliser `status`
      page: this.page,
      size: this.size,
      sort: this.sort
    }).subscribe(res => {
      this.items = res.items;
      this.total = res.total;
    });
  }

  activate(u: AdminUserItem) {
    if (!confirm(`Activer le compte de ${u.prenom} ${u.nom} ?`)) return;
    this.api.activate(u.id).subscribe(() => this.load(this.page));
  }

  block(u: AdminUserItem) {
    if (!confirm(`Bloquer le compte de ${u.prenom} ${u.nom} ?`)) return;
    this.api.block(u.id).subscribe(() => this.load(this.page));
  }

  initials(name: string) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }
  avatarBg(seed: any) {
    const colors = [
      'bg-gradient-to-br from-primary to-primary-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-700',
      'bg-gradient-to-br from-amber-500 to-amber-700',
      'bg-gradient-to-br from-emerald-500 to-emerald-700',
      'bg-gradient-to-br from-sky-500 to-sky-700',
    ];
    const h = Math.abs(this.hash(String(seed)));
    return colors[h % colors.length];
  }
  private hash(s: string) { let h=0; for (let i=0;i<s.length;i++) h=(h<<5)-h+s.charCodeAt(i)|0; return h; }

  statusBadge(statut: string) {
    return {
      'badge px-2 py-1 rounded-lg text-xs': true,
      'bg-green-100 text-green-700': statut === 'ACTIF',
      'bg-rose-100 text-rose-700': statut === 'BLOQUE',
    };
  }
}

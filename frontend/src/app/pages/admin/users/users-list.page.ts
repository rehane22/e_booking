import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminUserApi, AdminUserItem } from '../../../core/api/admin-user.api';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users-list.page.html',
})
export class UsersListPage implements OnInit {
  private api = inject(AdminUserApi);

  items: AdminUserItem[] = [];
  total = 0; page = 0; size = 20;
  query = '';
  status: 'ALL'|'ACTIF'|'BLOQUE' = 'ALL'; 
  role: 'ALL'|'CLIENT'|'PRO' = 'ALL';
  sort = 'createdAt,DESC';

  ngOnInit() { this.load(0); }

  load(p = 0) {
    this.page = p;
    this.api.list({
      query: this.query,
      status: this.status,  
      role: this.role,
      excludeRole: 'ADMIN',
      page: this.page,
      size: this.size,
      sort: this.sort
    }).subscribe(res => {
      this.items = res.items;
      this.total = res.total;
    });
  }

  applyFilters() { this.load(0); }

  resetFilters() {
    this.query = '';
    this.status = 'ALL';
    this.role = 'ALL';
    this.load(0);
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

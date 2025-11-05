// src/app/core/api/admin-user.api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UserStatus = 'ACTIF' | 'BLOQUE' ;
export interface AdminUserItem {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  roles: ('CLIENT'|'PRO'|'ADMIN')[];
  statut: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminUserDetail extends AdminUserItem {
  adresse?: string;
  rdvCount?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AdminUserApi {
  private http = inject(HttpClient);
  // garde /api si ton proxy le réécrit vers le back ; sinon mets simplement '/admin/users'
  private base = '/api/admin/users';

  list(opts: {
    query?: string;
    // ⚠️ le back attend `status`, pas `statut`
    status?: UserStatus | 'ALL';
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<AdminUserItem>> {
    let params = new HttpParams()
      .set('page', String(opts?.page ?? 0))
      .set('size', String(opts?.size ?? 20));

    if (opts?.query)  params = params.set('query', opts.query);
    if (opts?.status && opts.status !== 'ALL') params = params.set('status', opts.status);
    if (opts?.sort)   params = params.set('sort', opts.sort);

    return this.http.get<Page<AdminUserItem>>(this.base, { params });
  }

  get(id: number | string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.base}/${id}`);
  }

  // ✅ passer en POST pour matcher le backend
  activate(id: number | string) {
    return this.http.post<void>(`${this.base}/${id}/activate`, {});
  }

  block(id: number | string) {
    return this.http.post<void>(`${this.base}/${id}/block`, {});
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UserStatus = 'ACTIF' | 'BLOQUE' ;
export type UserRoleFilter = 'CLIENT' | 'PRO' | 'ADMIN' | 'ALL';
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

  private base = '/api/admin/users';

  list(opts: {
    query?: string;
    status?: UserStatus | 'ALL';
    role?: UserRoleFilter;
    excludeRole?: UserRoleFilter | 'NONE';
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<AdminUserItem>> {
    let params = new HttpParams()
      .set('page', String(opts?.page ?? 0))
      .set('size', String(opts?.size ?? 20));

    if (opts?.query)  params = params.set('query', opts.query);
    if (opts?.status && opts.status !== 'ALL') params = params.set('status', opts.status);
    if (opts?.role && opts.role !== 'ALL') params = params.set('role', opts.role);
    if (opts?.excludeRole && opts.excludeRole !== 'ALL') params = params.set('excludeRole', opts.excludeRole);
    if (opts?.sort)   params = params.set('sort', opts.sort);

    return this.http.get<Page<AdminUserItem>>(this.base, { params });
  }

  get(id: number | string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.base}/${id}`);
  }


  activate(id: number | string) {
    return this.http.post<void>(`${this.base}/${id}/activate`, {});
  }

  block(id: number | string) {
    return this.http.post<void>(`${this.base}/${id}/block`, {});
  }
}

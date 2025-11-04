import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UserDetail = {
  id: number | string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string | null;
  statut: string;           // 'ACTIF' | 'BLOQUE' ...
  roles: string[];          // ['CLIENT', 'ADMIN', ...]
};

export type UpdateUserPayload = {
  prenom: string;
  nom: string;
  telephone?: string | null;
};

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private base = '/api';

  constructor(private http: HttpClient) {}

  getById(id: number | string): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.base}/users/${id}`);
  }

  updateById(id: number | string, body: UpdateUserPayload): Observable<UserDetail> {
    return this.http.put<UserDetail>(`${this.base}/users/${id}`, body);
  }

  deleteById(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }
}

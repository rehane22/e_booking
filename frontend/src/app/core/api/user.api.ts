import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

export type UserMe = {
  id: number | string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  roles?: string[];
};

export type UpdateMePayload = {
  prenom?: string;
  nom?: string;
  telephone?: string;
};

@Injectable({ providedIn: 'root' })
export class UserApi {
  private base = '/api'; 

  constructor(private http: HttpClient) {}

  me() {

    return this.http.get<UserMe>(`${this.base}/me`).pipe(
      map((u: any) => ({
        id: u.id,
        prenom: u.prenom ?? '',
        nom: u.nom ?? '',
        email: u.email ?? '',
        telephone: u.telephone ?? '',
        roles: u.roles ?? [],
      } as UserMe))
    );
  }

}
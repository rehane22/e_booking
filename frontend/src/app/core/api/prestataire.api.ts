import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, of } from 'rxjs';

export type PrestataireMe = { id: string|number; specialite?: string; adresse?: string; services?: any[] };

@Injectable({ providedIn: 'root' })
export class PrestataireApi {
  private base = '/api';
  constructor(private http: HttpClient) {}

  me() { return this.http.get<PrestataireMe>(`${this.base}/prestataires/me`); }

  onboarding(body: { specialite:string; adresse:string; serviceIds:(string|number)[] }) {
    return this.http.post<PrestataireMe>(`${this.base}/prestataires/onboarding`, body);
  }

  linkService(prestataireId: string|number, serviceId: string|number) {
    return this.http.post<void>(`${this.base}/prestataires/${prestataireId}/services/${serviceId}`, {});
  }
  unlinkService(prestataireId: string|number, serviceId: string|number) {
    return this.http.delete<void>(`${this.base}/prestataires/${prestataireId}/services/${serviceId}`);
  }

  listByServiceSlug(serviceSlug: string) {
  return this.http.get<any[]>(`${this.base}/prestataires`, { params: { serviceSlug } });
}
/** Nouveau: liste publique des prestataires par serviceId (ton endpoint listByService) */
  listByServiceId(serviceId: string | number) {
    const params = new HttpParams().set('serviceId', String(serviceId));
    return this.http.get<any[]>(`${this.base}/prestataires`, { params });
  }

  /** Multi-sélection : agrège plusieurs serviceIds côté front et déduplique par prestataire.id */
  listByServiceIds(serviceIds: (string|number)[]) {
    if (!serviceIds.length) return of<any[]>([]);
    const calls = serviceIds.map(id => this.listByServiceId(id));
    return forkJoin(calls).pipe(
      map((arrays) => {
        const byId = new Map<string|number, any>();
        arrays.flat().forEach(p => byId.set(p.id, p));
        return Array.from(byId.values());
      })
    );
  }

  /** Nouveau: profil public complet (ton endpoint getPublic) */
  getPublic(prestataireId: string|number) {
    return this.http.get<any>(`${this.base}/prestataires/${prestataireId}`);
  }

   findById(prestataireId: string|number) {
    return this.http.get<any>(`${this.base}/prestataires/${prestataireId}`);
  }
  findManyByIds(ids: (string|number)[]) {
    if (!ids.length) return of<any[]>([]);
    return forkJoin(ids.map(id => this.findById(id)));
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type Disponibilite = {
  id: string|number;
  prestataireId: string|number;
  jourSemaine: number;            // 1..7 (lun..dim) par ex.
  heureDebut: string;             // "09:00"
  heureFin: string;               // "17:00"
  serviceId?: string|number|null;
};

@Injectable({ providedIn: 'root' })
export class DisponibiliteApi {
  private base = '/api';
  constructor(private http: HttpClient) {}

  listByPrestataire(prestataireId: string|number) {
    return this.http.get<Disponibilite[]>(`${this.base}/disponibilites/${prestataireId}`);
  }
  create(body: Omit<Disponibilite,'id'>) {
    return this.http.post<Disponibilite>(`${this.base}/disponibilites`, body);
  }
  update(id: string|number, body: Partial<Disponibilite>) {
    return this.http.put<Disponibilite>(`${this.base}/disponibilites/${id}`, body);
  }
  remove(id: string|number) {
    return this.http.delete<void>(`${this.base}/disponibilites/${id}`);
  }
  


  /** Endpoint public: slots dispo pour un prestataire à une date (serviceId optionnel) */
  slotsForDate(prestataireId: string|number, dateISO: string, serviceId?: string|number|null) {
    let params = new HttpParams().set('date', dateISO);
    if (serviceId != null) params = params.set('serviceId', String(serviceId));
    return this.http.get<string[]>(`${this.base}/disponibilites/${prestataireId}/slots`, { params });
  }



}

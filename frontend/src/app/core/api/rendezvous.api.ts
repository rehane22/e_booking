import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type Rdv = {
  id: string|number;
  date: string;      
  heure: string;  
  clientNom: string;
  serviceNom: string;    
  prestataireId: number | string;
  clientId: number | string;
  serviceId: number | string;
  statut: 'CONFIRME'|'ANNULE';
};


export type CreateRdvPayload = {
  serviceId: number | string;
  prestataireId: number | string;
  date: string;   // YYYY-MM-DD
  heure: string;  // HH:mm
};

@Injectable({ providedIn: 'root' })
export class RendezVousApi {
  private base = '/api';
  constructor(private http: HttpClient) {}

  listByPrestataire(prestataireId: string|number, date?: string) {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.get<Rdv[]>(`${this.base}/rendezvous/prestataire/${prestataireId}${q}`);
  }
  confirmer(id: string|number) {
    return this.http.patch<Rdv>(`${this.base}/rendezvous/${id}/confirmer`, {});
  }
  annuler(id: string|number) {
    return this.http.patch<Rdv>(`${this.base}/rendezvous/${id}/annuler`, {});
  }
  listByClient(clientId: string|number) {
    return this.http.get<Rdv[]>(`${this.base}/rendezvous/client/${clientId}`, {});
  }

  create(payload: CreateRdvPayload) {
    return this.http.post<any>(`${this.base}/rendezvous`, payload);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type RdvStatut = 'EN_ATTENTE'|'CONFIRME'|'ANNULE'|'REFUSE';

export type Rdv = {
  id: string|number;
  date: string;           // "YYYY-MM-DD"
  heure: string;          // "HH:mm"
  clientNom: string;
  serviceNom: string;
  prestataireId: number|string;
  clientId: number|string;
  serviceId: number|string;
  statut: RdvStatut;
  serviceDureeMin?: number; // pour calcul heure fin
};

export type CreateRdvPayload = {
  serviceId: number|string;
  prestataireId: number|string;
  date: string;   // YYYY-MM-DD
  heure: string;  // HH:mm
  dureeMin?: number;
};

export type UpdateRdvPayload = Partial<{
  serviceId: number|string;
  date: string;   // YYYY-MM-DD
  heure: string;  // HH:mm
}>;

@Injectable({ providedIn: 'root' })
export class RendezVousApi {
  private base = '/api';
  constructor(private http: HttpClient) {}

  listByPrestataire(prestataireId: string|number, date?: string) {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.get<Rdv[]>(`${this.base}/rendezvous/prestataire/${prestataireId}${q}`);
  }

  listByClient(clientId: string|number) {
    return this.http.get<Rdv[]>(`${this.base}/rendezvous/client/${clientId}`);
  }

  create(payload: CreateRdvPayload) {
    return this.http.post<Rdv>(`${this.base}/rendezvous`, payload);
  }

  confirmer(id: string|number) {
    return this.http.patch<Rdv>(`${this.base}/rendezvous/${id}/confirmer`, {});
  }

  annuler(id: string|number) {
    return this.http.patch<Rdv>(`${this.base}/rendezvous/${id}/annuler`, {});
  }

  /** Nouveau: refuser (côté PRO) */
  refuser(id: string|number) {
    return this.http.patch<Rdv>(`${this.base}/rendezvous/${id}/refuser`, {});
  }

  /** Nouveau: modifier */
  modifier(id: string|number, payload: UpdateRdvPayload) {
    return this.http.patch<Rdv>(`${this.base}/rendezvous/${id}`, payload);
  }
}

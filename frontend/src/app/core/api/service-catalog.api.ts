import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type ServiceItem = { id: string|number; nom: string; icon?: string };

@Injectable({ providedIn: 'root' })
export class ServiceCatalogApi {
  private base = '/api';
  constructor(private http: HttpClient) {}
  findAll() { return this.http.get<ServiceItem[]>(`${this.base}/services`); }
  create(body: any) { return this.http.post<ServiceItem>(`${this.base}/services`, body); }
  update(id: string|number, body: any) { return this.http.put<ServiceItem>(`${this.base}/services/${id}`, body); }
  remove(id: string|number) { return this.http.delete<void>(`${this.base}/services/${id}`); }
}

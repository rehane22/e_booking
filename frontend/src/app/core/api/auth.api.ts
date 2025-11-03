import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private base = '/api';
  constructor(private http: HttpClient) {}
  register(body: any) { return this.http.post<any>(`${this.base}/users/register`, body); }
  login(body: any)    { return this.http.post<any>(`${this.base}/users/login`, body); }
  me()                { return this.http.get<any>(`${this.base}/me`); }
}

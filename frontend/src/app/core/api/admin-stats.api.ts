import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StatsSummary {
  from: string; to: string;
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalRdv: number;
  todayRdv: number;
  occupancyRate: number; 
  avgLeadTimeDays?: number; 
}

export interface SeriesPoint { date: string; value: number; }

@Injectable({ providedIn: 'root' })
export class AdminStatsApi {
  private http = inject(HttpClient);
  private base = '/api/admin/stats';

  summary(from: string, to: string): Observable<StatsSummary> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<StatsSummary>(`${this.base}/summary`, { params });
  }

  series(metric: 'rdv_count'|'occupancy_rate', from: string, to: string, period: 'daily'|'weekly' = 'daily') {
    const params = new HttpParams()
      .set('metric', metric).set('from', from).set('to', to).set('period', period);
    return this.http.get<SeriesPoint[]>(`${this.base}/series`, { params });
  }
}

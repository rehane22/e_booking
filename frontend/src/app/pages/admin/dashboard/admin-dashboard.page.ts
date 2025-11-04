// src/app/pages/admin/dashboard/admin-dashboard.page.ts
import { Component, OnInit, computed, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminStatsApi, StatsSummary } from '../../../core/api/admin-stats.api';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Dashboard Admin</h1>
      <div class="flex items-center gap-3">
        <select class="input h-10" [(ngModel)]="preset" (change)="applyPreset()">
          <option value="7">7 jours</option>
          <option value="30">30 jours</option>
          <option value="90">90 jours</option>
          <option value="custom">Personnalisé</option>
        </select>
        <input type="date" class="input h-10" [(ngModel)]="from" [disabled]="preset!=='custom'"/>
        <input type="date" class="input h-10" [(ngModel)]="to" [disabled]="preset!=='custom'"/>
        <button class="btn-primary h-10" (click)="load()">Actualiser</button>
      </div>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      <div class="card p-6">
        <h3 class="font-semibold">Utilisateurs</h3>
        <p class="text-3xl mt-2">{{ summary()?.totalUsers ?? '—' }}</p>
        <div class="text-sm text-muted mt-1 flex items-center justify-between">
          <div>
            <span class="badge bg-primary/10 text-primary mr-2">Actifs: {{ summary()?.activeUsers ?? '—' }}</span>
            <span class="badge bg-amber-100 text-amber-700">Bloqués: {{ summary()?.blockedUsers ?? '—' }}</span>
          </div>

          <a class="btn-ghost h-9 mr-2" [routerLink]="['/admin/users']">Voir</a>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="font-semibold">Rendez-vous</h3>
        <p class="text-3xl mt-2">{{ summary()?.totalRdv ?? '—' }}</p>
        <p class="text-sm text-muted mt-1">Aujourd’hui: {{ summary()?.todayRdv ?? '—' }}</p>
      </div>

      <div class="card p-6">
        <h3 class="font-semibold">Taux d’occupation</h3>
        <p class="text-3xl mt-2">{{ summary()?.occupancyRate ?? '—' }}%</p>
        <p class="text-sm text-muted mt-1">Délai moyen: {{ summary()?.avgLeadTimeDays ?? '—' }} j</p>
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Évolution des RDV</h3>
        <div class="text-sm text-muted">{{ from }} → {{ to }}</div>
      </div>

      
      <div class="mt-4 grid grid-cols-12 gap-2 items-end h-36">
        @for (p of series(); track $index) {
          <div class="bg-primary/60 rounded" [style.height.%]="barHeight(p.value)" title="{{p.date}}: {{p.value}}"></div>
        }
      </div>
      <div class="mt-2 text-xs text-muted">Chaque barre = jour</div>
    </div>
  </div>
  `
})
export class AdminDashboardPage implements OnInit {
  private api = inject(AdminStatsApi);

  preset: '7' | '30' | '90' | 'custom' = '30';
  from = this.isoOffsetDays(-30);
  to = this.isoOffsetDays(0);

  readonly summary = signal<StatsSummary | undefined>(undefined);
  readonly series = signal<{ date: string; value: number }[]>([]);

  ngOnInit() {
    this.applyPreset();
    this.load();
  }

  applyPreset() {
    if (this.preset !== 'custom') {
      const days = Number(this.preset);
      this.from = this.isoOffsetDays(-days);
      this.to = this.isoOffsetDays(0);
    }
  }

  load() {
    this.api.summary(this.from, this.to).subscribe(s => this.summary.set(s));
    this.api.series('rdv_count', this.from, this.to, 'daily').subscribe(s => this.series.set(s));
  }

  barHeight(v: number) {
    const max = Math.max(1, ...this.series().map(s => s.value));
    return (v / max) * 100;
  }

  private isoOffsetDays(d: number) {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
  }
}

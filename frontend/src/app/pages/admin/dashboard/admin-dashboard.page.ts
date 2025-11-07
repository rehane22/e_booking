import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminStatsApi, StatsSummary, SeriesPoint } from '../../../core/api/admin-stats.api';
import { ServiceCatalogApi, ServiceItem } from '../../../core/api/service-catalog.api';

type Delta = { value: number; sign: 'up'|'down'|'flat'; pct?: number };


function isoOffsetDays(delta: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.page.html',
})
export class AdminDashboardPage implements OnInit {
  private statsApi = inject(AdminStatsApi);
  private svcApi = inject(ServiceCatalogApi);


  preset: '7'|'30'|'90'|'custom' = '30';
 from = isoOffsetDays(-30);
to   = isoOffsetDays(0);


  prevFrom = '';
  prevTo = '';


  readonly summary = signal<StatsSummary | undefined>(undefined);
  readonly prevSummary = signal<StatsSummary | undefined>(undefined);
  readonly series = signal<SeriesPoint[]>([]);
  readonly occSeries = signal<SeriesPoint[]>([]);


  readonly services = signal<ServiceItem[]>([]);
  readonly servicesView = signal<ServiceItem[]>([]);
  svcQuery = '';


  readonly editRow = signal<Partial<ServiceItem> | null>(null);
  saveError = '';
  touchNom = false;

  ngOnInit() {
    this.applyPreset();
    this.load();
    this.reloadServices();
  }

  /* ====== Stats & séries ====== */
  applyPreset() {
    if (this.preset !== 'custom') {
      const days = Number(this.preset);
      this.from = isoOffsetDays(-days);
      this.to = isoOffsetDays(0);
    }
    this.computePrevRange();
  }

  load() {

    this.statsApi.summary(this.from, this.to).subscribe(s => this.summary.set(s));
    this.statsApi.series('rdv_count', this.from, this.to, 'daily').subscribe(s => this.series.set(s));
    this.statsApi.series('occupancy_rate', this.from, this.to, 'daily').subscribe(s => this.occSeries.set(s));


    this.statsApi.summary(this.prevFrom, this.prevTo).subscribe(s => this.prevSummary.set(s));
  }

  avgPerDay(total?: number) {
    if (total == null) return '—';
    const days = this.daysBetween(this.from, this.to);
    return (days > 0 ? (total / days).toFixed(1) : '—');
  }

  rdvDelta(): Delta {
    const cur = this.summary()?.totalRdv ?? 0;
    const prev = this.prevSummary()?.totalRdv ?? 0;
    return this.makeDelta(cur, prev, true);

  }

  occDelta(): Delta {
    const cur = this.summary()?.occupancyRate ?? 0;
    const prev = this.prevSummary()?.occupancyRate ?? 0;
    return this.makeDelta(cur, prev, false); 
  }

  barHeightGeneric(v: number, arr: { value: number }[]) {
    const max = Math.max(1, ...arr.map(s => s.value));
    return (v / max) * 100;
  }

  occBarClass(rate: number) {
    const r = this.clamp(rate);
    if (r >= 70) return 'bg-emerald-500';
    if (r >= 40) return 'bg-amber-500';
    return 'bg-black/40';
  }

  clamp(v: number) { return Math.max(0, Math.min(100, v)); }

  private computePrevRange() {
    const days = this.daysBetween(this.from, this.to);
    
    const start = this.shiftDate(this.from, -days);
    const end = this.shiftDate(this.from, -1);
    this.prevFrom = start;
    this.prevTo = end;
  }

  private daysBetween(from: string, to: string) {
    const a = new Date(from + 'T00:00:00Z').getTime();
    const b = new Date(to + 'T00:00:00Z').getTime();
    const diff = Math.max(0, (b - a) / (1000*60*60*24)) + 1; 
    return Math.max(1, Math.floor(diff));
  }

  private shiftDate(iso: string, deltaDays: number) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    return d.toISOString().slice(0,10);
  }

  private makeDelta(cur: number, prev: number, pctRelative: boolean): Delta {
    const value = +(cur - prev).toFixed(pctRelative ? 0 : 1);
    const sign: Delta['sign'] = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
    const pct = prev > 0 ? +(((cur - prev) / prev) * 100).toFixed(1) : (cur > 0 ? 100 : 0);
    return { value, sign, pct };
  }

  arrow(d: Delta) { return d.sign === 'up' ? '▲' : d.sign === 'down' ? '▼' : '•'; }
  deltaClass(d: Delta) {
    if (d.sign === 'up') return 'text-emerald-600';
    if (d.sign === 'down') return 'text-amber-600';
    return 'text-muted';
  }

  /* ====== Services CRUD ====== */
  reloadServices() {
    this.svcApi.findAll().subscribe(list => {
      this.services.set(list || []);
      this.applySvcFilter();
    });
  }
  applySvcFilter() {
    const q = (this.svcQuery || '').trim().toLowerCase();
    if (!q) { this.servicesView.set(this.services()); return; }
    this.servicesView.set(
      this.services().filter(s =>
        s.nom.toLowerCase().includes(q) ||
        (s.description ? s.description.toLowerCase().includes(q) : false)
      )
    );
  }

  isEditing() { return !!this.editRow(); }
  startCreate() { this.saveError=''; this.touchNom=false; this.editRow.set({ nom:'', description:'' }); }
  startEdit(s: ServiceItem) { this.saveError=''; this.touchNom=false; this.editRow.set({ id:s.id, nom:s.nom, description:s.description||'' }); }

  validNom() {
    const r = this.editRow(); const n = (r?.nom||'').trim();
    return n.length >= 2 && n.length <= 100;
  }
  canSaveEdit() {
    const r = this.editRow();
    if (!r) return false;
    if (!this.validNom()) return false;
    if (r.id && !this.canUpdate()) return false; 
    return true;
  }
  cancelEdit() { this.editRow.set(null); this.saveError=''; }

  saveEdit() {
    const r = this.editRow();
    if (!r || !this.canSaveEdit()) return;

    const payload = {
      nom: (r.nom || '').trim(),
      description: (r.description || '').trim() || null
    };

    if (!r.id) {
      this.svcApi.create(payload).subscribe({
        next: created => {
          this.services.set([created, ...this.services()]);
          this.applySvcFilter();
          this.editRow.set(null);
        },
        error: (e) => this.saveError = this.humanizeError(e)
      });
      return;
    }

    this.svcApi.update(r.id, payload).subscribe({
      next: updated => {
        this.services.set(this.services().map(s => s.id === updated.id ? updated : s));
        this.applySvcFilter();
        this.editRow.set(null);
      },
      error: (e) => this.saveError = this.humanizeError(e)
    });
  }

  remove(s: ServiceItem) {
    if (!this.canDelete()) return;
    if (!confirm(`Supprimer le service « ${s.nom} » ?`)) return;

    const prev = this.services();
    this.services.set(prev.filter(x => x.id !== s.id));
    this.applySvcFilter();

    this.svcApi.remove(s.id).subscribe({
      error: (e) => {
        this.services.set(prev);
        this.applySvcFilter();
        alert(this.humanizeError(e));
      }
    });
  }

  private humanizeError(e: any): string {
    const status = e?.status;
    const msg = e?.error?.message || e?.message || '';

    if (status === 403) return 'Action interdite : droit insuffisant.';
    if (status === 404 || /introuvable/i.test(msg)) return 'Service introuvable.';
    if (status === 409 || /déjà utilisé|duplicate/i.test(msg)) return 'Nom de service déjà utilisé.';
    if (status === 422) return 'Données invalides.';
    if (/validation|NotBlank|Size/i.test(msg)) return 'Vérifie les champs (nom max 100, description max 10 000).';

    return msg || 'Une erreur est survenue.';
  }

  /* ====== Droits UI (basés sur localStorage.roles) ====== */
  private roles(): string[] {
    try { return JSON.parse(localStorage.getItem('roles') || '[]') as string[]; } catch { return []; }
  }
  has(role: 'ADMIN'|'PRO'|'CLIENT') { return this.roles().includes(role); }
  canCreate() { return this.has('ADMIN') || this.has('PRO'); }
  canUpdate() { return this.has('ADMIN'); }
  canDelete() { return this.has('ADMIN'); }
}

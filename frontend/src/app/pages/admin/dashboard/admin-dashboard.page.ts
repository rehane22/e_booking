// src/app/pages/admin/dashboard/admin-dashboard.page.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminStatsApi, StatsSummary, SeriesPoint } from '../../../core/api/admin-stats.api';
import { ServiceCatalogApi, ServiceItem } from '../../../core/api/service-catalog.api';

type Delta = { value: number; sign: 'up'|'down'|'flat'; pct?: number };

// 🔧 Ajoute ça tout en haut du fichier (hors classe)
function isoOffsetDays(delta: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header + période -->
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

    <!-- Stats tuiles -->
    <div class="grid md:grid-cols-3 gap-6">
      <!-- Utilisateurs -->
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Utilisateurs</h3>
          <a class="btn-ghost h-9" [routerLink]="['/admin/users']">Voir</a>
        </div>
        <p class="text-3xl mt-2">{{ summary()?.totalUsers ?? '—' }}</p>
        <div class="text-sm text-muted mt-1">
          <span class="badge bg-primary/10 text-primary mr-2">Actifs: {{ summary()?.activeUsers ?? '—' }}</span>
          <span class="badge bg-amber-100 text-amber-700">Bloqués: {{ summary()?.blockedUsers ?? '—' }}</span>
        </div>
      </div>

      <!-- RDV -->
      <div class="card p-6">
        <h3 class="font-semibold">Rendez-vous</h3>
        <p class="text-3xl mt-2">{{ summary()?.totalRdv ?? '—' }}</p>
        <p class="text-sm text-muted mt-1">Aujourd’hui: {{ summary()?.todayRdv ?? '—' }}</p>
      </div>

      <!-- Occupation -->
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Taux d’occupation</h3>
          <span class="inline-flex items-center text-xs text-muted"
                title="Définition : créneaux réservés / capacité totale sur la période × 100.">
            
          </span>
        </div>

        <div class="mt-2 flex items-baseline gap-3">
          <p class="text-3xl">{{ summary()?.occupancyRate ?? '—' }}%</p>
          <span class="text-sm text-muted">Réservé / capacité</span>
        </div>

        <!-- Barre de progression -->
        <div class="mt-3 w-full h-3 rounded-full bg-black/10 overflow-hidden" aria-label="Taux d’occupation">
          <div class="h-3" [ngClass]="occBarClass(summary()?.occupancyRate || 0)"
               [style.width.%]="clamp(summary()?.occupancyRate || 0)"></div>
        </div>
      </div>
    </div>

    <!-- Évolution RDV (graph clair) -->
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold">Évolution des RDV</h3>
          <div class="text-xs text-muted">Chaque barre = RDV par jour • Moy./jour : {{ avgPerDay(summary()?.totalRdv) }}</div>
        </div>
        <div class="text-sm text-muted">{{ from }} → {{ to }}</div>
      </div>

      <div class="mt-4 grid grid-cols-12 gap-2 items-end h-36">
        @for (p of series(); track $index) {
          <div class="bg-primary/60 rounded"
               [style.height.%]="barHeightGeneric(p.value, series())"
               [title]="p.date + ': ' + p.value"></div>
        }
      </div>

      <div class="mt-2 flex items-center justify-between text-xs text-muted">
        <span>Total période : {{ summary()?.totalRdv ?? '—' }}</span>
      </div>
    </div>

    <!-- Gestion des services -->
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Gestion des services</h3>
        <div class="flex items-center gap-2">
          <input class="input h-10" placeholder="Rechercher un service…" [(ngModel)]="svcQuery" (ngModelChange)="applySvcFilter()">
          <button class="btn-primary h-10" (click)="startCreate()" [disabled]="isEditing() || !canCreate()">Nouveau</button>
        </div>
      </div>

      @if (editRow()) {
        <div class="mt-4 p-4 rounded-xl border bg-rose-card/40">
          <div class="grid md:grid-cols-3 gap-3">
            <div class="md:col-span-1">
              <label class="text-xs">Nom <span class="text-muted">(max 100)</span></label>
              <input class="input h-10" [(ngModel)]="editRow()!.nom" maxlength="100" placeholder="Ex: Onglerie" (ngModelChange)="touchNom=true">
              <div class="text-xs mt-1" [class.text-red-600]="!validNom()">
                {{ (editRow()?.nom?.length||0) }}/100
                @if (!validNom() && touchNom) { · Le nom doit faire au moins 2 caractères. }
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs">Description <span class="text-muted">(max 10 000 — optionnel)</span></label>
              <textarea class="input min-h-24" [(ngModel)]="editRow()!.description" maxlength="10000" placeholder="Détail du service, catégories, exemples…"></textarea>
              <div class="text-xs mt-1 text-muted">{{ (editRow()?.description?.length||0) }}/10000</div>
            </div>
          </div>

          <div class="mt-3 flex items-center gap-2">
            <button class="btn-primary h-10" (click)="saveEdit()" [disabled]="!canSaveEdit()">
              {{ editRow()?.id ? 'Mettre à jour' : 'Créer' }}
            </button>
            <button class="btn-ghost h-10" (click)="cancelEdit()">Annuler</button>
            @if (editRow()?.id && !canUpdate()) {
              <span class="text-xs text-muted">Seul un ADMIN peut modifier.</span>
            }
          </div>

          @if (saveError) {
            <div class="mt-2 text-sm text-red-600">{{ saveError }}</div>
          }
        </div>
      }

      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted border-b">
              <th class="py-2 pr-3">Nom</th>
              <th class="py-2 pr-3">Description</th>
              <th class="py-2 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (s of servicesView(); track s.id) {
              <tr class="border-b last:border-0 align-top">
                <td class="py-3 pr-3 font-medium">{{ s.nom }}</td>
                <td class="py-3 pr-3 whitespace-pre-wrap text-muted">{{ s.description || '—' }}</td>
                <td class="py-3">
                  <div class="flex flex-cols gap-2">
                    <button class="btn-ghost h-9" (click)="startEdit(s)" [disabled]="isEditing() || !canUpdate()">Modifier</button>
                    <button class="btn-ghost h-9 text-red-600" (click)="remove(s)" [disabled]="isEditing() || !canDelete()">Supprimer</button>
                    @if (!canUpdate()) { <span class="text-[11px] text-muted">ADMIN requis</span> }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td class="py-4 text-muted" colspan="3">Aucun service.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `
})
export class AdminDashboardPage implements OnInit {
  private statsApi = inject(AdminStatsApi);
  private svcApi = inject(ServiceCatalogApi);

  // Période courante
  preset: '7'|'30'|'90'|'custom' = '30';
 from = isoOffsetDays(-30);
to   = isoOffsetDays(0);

  // Période précédente (pour Δ)
  prevFrom = '';
  prevTo = '';

  // Stats + séries
  readonly summary = signal<StatsSummary | undefined>(undefined);
  readonly prevSummary = signal<StatsSummary | undefined>(undefined);
  readonly series = signal<SeriesPoint[]>([]);
  readonly occSeries = signal<SeriesPoint[]>([]);

  // Services
  readonly services = signal<ServiceItem[]>([]);
  readonly servicesView = signal<ServiceItem[]>([]);
  svcQuery = '';

  // Édition
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
    // période courante
    this.statsApi.summary(this.from, this.to).subscribe(s => this.summary.set(s));
    this.statsApi.series('rdv_count', this.from, this.to, 'daily').subscribe(s => this.series.set(s));
    this.statsApi.series('occupancy_rate', this.from, this.to, 'daily').subscribe(s => this.occSeries.set(s));

    // période précédente (pour Δ)
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
    // value: différence absolue de RDV, pct: % vs précédent
  }

  occDelta(): Delta {
    const cur = this.summary()?.occupancyRate ?? 0;
    const prev = this.prevSummary()?.occupancyRate ?? 0;
    return this.makeDelta(cur, prev, false); // points de % (pas diviser par 100)
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
    // Période précédente = même durée qui précède immédiatement "from"
    const start = this.shiftDate(this.from, -days);
    const end = this.shiftDate(this.from, -1);
    this.prevFrom = start;
    this.prevTo = end;
  }

  private daysBetween(from: string, to: string) {
    const a = new Date(from + 'T00:00:00Z').getTime();
    const b = new Date(to + 'T00:00:00Z').getTime();
    const diff = Math.max(0, (b - a) / (1000*60*60*24)) + 1; // inclusif
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
    if (r.id && !this.canUpdate()) return false; // update => ADMIN only
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

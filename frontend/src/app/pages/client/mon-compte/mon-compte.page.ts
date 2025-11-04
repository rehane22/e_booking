import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RendezVousApi, Rdv } from '../../../core/api/rendezvous.api';
import { UserApi, UserMe } from '../../../core/api/user.api';
import { UsersApi, UpdateUserPayload } from '../../../core/api/users.api';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Mon compte</h1>
      <a class="btn-ghost h-10" routerLink="/services">← Catalogue</a>
    </div>

    <!-- ======= INFOS PERSONNELLES ======= -->
    <section class="card p-6 mt-6">
      <h2 class="text-lg font-semibold">Informations personnelles</h2>
      <p class="text-sm text-muted mb-4">Modifie tes informations (l’email n’est pas modifiable).</p>

      <form class="grid md:grid-cols-2 gap-4" (ngSubmit)="save()" autocomplete="off">
        <div>
          <label class="text-xs">Prénom</label>
          <input class="input h-10 w-full" [(ngModel)]="form.prenom" name="prenom" required>
        </div>
        <div>
          <label class="text-xs">Nom</label>
          <input class="input h-10 w-full" [(ngModel)]="form.nom" name="nom" required>
        </div>
        <div>
          <label class="text-xs">Téléphone</label>
          <input class="input h-10 w-full" [(ngModel)]="form.telephone" name="telephone" placeholder="+336...">
        </div>
        <div>
          <label class="text-xs">Email</label>
          <input class="input h-10 w-full opacity-70 pointer-events-none" [value]="me?.email" disabled>
        </div>

        <div class="md:col-span-2 flex gap-2 mt-2">
          <button class="btn-primary h-11 px-6" type="submit" [disabled]="saving">
            @if (!saving) { Enregistrer } @else { <span class="opacity-80">Enregistrement…</span> }
          </button>
          <button type="button" class="btn-ghost h-11" (click)="reset()" [disabled]="saving">Réinitialiser</button>
        </div>

        @if (saveError) {
          <div class="md:col-span-2 text-sm text-red-600 mt-2">{{ saveError }}</div>
        }
        @if (saveOk) {
          <div class="md:col-span-2 text-sm text-emerald-600 mt-2">Profil mis à jour.</div>
        }
      </form>
    </section>

    <!-- ======= MES RENDEZ-VOUS ======= -->
    @if (!has('ADMIN')) {
      <section class="card p-6 mt-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Mes rendez-vous</h2>
          <div class="text-sm text-muted">
            @if (rdvs.length) { {{ rdvs.length }} RDV } @else { Aucun RDV }
          </div>
        </div>

        <div class="mt-4 grid gap-3">
          @for (r of rdvs; track r.id) {
            <div class="p-4 rounded-xl border flex flex-col md:flex-row md:items-center gap-3">
              <div class="flex-1">
                <p class="font-medium">
                  {{ r.date }} · {{ HHmm(r.heure) }}
                  <span class="text-xs text-muted">(#{{ r.prestataireId }})</span>
                </p>

                <div class="flex items-center gap-2 mt-1">
                  <p class="text-xs text-muted">
                    Statut :
                    <span [ngClass]="statutColor(r.statut)">{{ statutLabel(r.statut) }}</span>
                  </p>
                  <span class="text-[11px] px-2 py-0.5 rounded-full border"
                        [ngClass]="badgeTempsClasses(r)">
                    {{ badgeTempsLabel(r) }}
                  </span>
                </div>
              </div>

              <div class="flex gap-2">
                <a class="btn-primary h-9" [routerLink]="['/prestataires', r.prestataireId]">
                  Voir prestataire
                </a>

                @if (r.statut !== 'ANNULE' && !estPasse(r)) {
                  <button class="btn-ghost h-9"
                          (click)="cancel(r)"
                          [disabled]="cancelingId === r.id">
                    @if (cancelingId === r.id) { Annulation… } @else { Annuler }
                  </button>
                }
              </div>
            </div>
          } @empty {
            <div class="text-sm text-muted">Tu n’as pas encore de rendez-vous.</div>
          }
        </div>

        @if (listError) {
          <div class="mt-3 text-sm text-red-600">{{ listError }}</div>
        }
      </section>
    }
  </div>
  `
})
export class MonComptePage implements OnInit {
  private userApi = inject(UserApi);   // pour /me
  private usersApi = inject(UsersApi); // pour /users/{id}
  private rdvApi = inject(RendezVousApi);

  me: UserMe | null = null;

  form: { prenom: string; nom: string; telephone: string } = {
    prenom: '',
    nom: '',
    telephone: ''
  };
  saving = false;
  saveOk = false;
  saveError = '';

  rdvs: Rdv[] = [];
  cancelingId: number | string | null = null;
  listError = '';

  ngOnInit() {
    this.loadMeAndRdvs();
  }

  has(role: string){ try { return (JSON.parse(localStorage.getItem('roles')||'[]') as string[]).includes(role); } catch { return false; } }

  private loadMeAndRdvs() {
    this.saveOk = false; this.saveError = ''; this.listError = '';

    this.userApi.me().subscribe({
      next: (u) => {
        this.me = u;
        this.form = { prenom: u.prenom ?? '', nom: u.nom ?? '', telephone: u.telephone ?? '' };

        this.rdvApi.listByClient(u.id).subscribe({
          next: (items) => this.rdvs = this.sortRdv(items),
          error: () => this.listError = 'Impossible de charger tes rendez-vous.'
        });
      },
      error: () => { this.saveError = 'Impossible de charger ton profil (connecte-toi).'; }
    });
  }

  save() {
    if (!this.me) return;
    const body: UpdateUserPayload = {
      prenom: (this.form.prenom || '').trim(),
      nom: (this.form.nom || '').trim(),
      telephone: (this.form.telephone || '').trim() || null
    };
    this.saving = true; this.saveOk = false; this.saveError = '';

    this.usersApi.updateById(this.me.id, body).subscribe({
      next: (u) => {
        this.saving = false;
        this.saveOk = true;
        // refresh du /me pour garder cohérent localStorage éventuel
        this.userApi.me().subscribe(m => this.me = m);
      },
      error: (err) => {
        this.saving = false;
        const msg = (err?.error?.message || err?.error || '').toString();
        this.saveError = msg || 'Erreur lors de la mise à jour.';
      }
    });
  }

  reset() {
    if (!this.me) return;
    this.form = { prenom: this.me.prenom ?? '', nom: this.me.nom ?? '', telephone: this.me.telephone ?? '' };
    this.saveOk = false; this.saveError = '';
  }

  cancel(r: Rdv) {
    if (r.statut === 'ANNULE' || this.estPasse(r)) return;
    if (!confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
    this.cancelingId = r.id;
    this.rdvApi.annuler(r.id).subscribe({
      next: (updated) => { this.rdvs = this.rdvs.map(x => x.id === updated.id ? updated : x); this.cancelingId = null; },
      error: (err) => { this.cancelingId = null; alert((err?.error?.message || err?.error || '').toString() || 'Annulation impossible.'); }
    });
  }

  private toDateTime(r: Rdv): Date { const t = this.HHmm(r.heure); return new Date(`${r.date}T${t}:00`); }
  estPasse(r: Rdv): boolean { return this.toDateTime(r).getTime() < Date.now(); }
  private isSameDay(a: Date, b: Date){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  private isTomorrow(d: Date, now=new Date()){ const t = new Date(now); t.setDate(now.getDate()+1); return this.isSameDay(d,t); }
  badgeTempsLabel(r: Rdv){ const d=this.toDateTime(r), now=new Date(); if(this.isSameDay(d,now)) return 'Aujourd’hui'; if(this.isTomorrow(d,now)) return 'Demain'; if(this.estPasse(r)) return 'Passé'; return 'À venir'; }
  badgeTempsClasses(r: Rdv){ const passed=this.estPasse(r); return { 'border-emerald-300 text-emerald-700 bg-emerald-50': !passed && this.isSameDay(this.toDateTime(r), new Date()), 'border-amber-300 text-amber-700 bg-amber-50': !passed && !this.isSameDay(this.toDateTime(r), new Date()), 'border-gray-300 text-gray-600 bg-gray-50': passed }; }
  sortRdv(items: Rdv[]){ return [...items].sort((a,b)=> this.toDateTime(a).toISOString().localeCompare(this.toDateTime(b).toISOString())); }
  HHmm(h: string){ if(!h) return ''; const p=h.split(':'); return p[0].padStart(2,'0')+':'+p[1].padStart(2,'0'); }
  statutLabel(s: Rdv['statut']){ switch(s){ case 'CONFIRME': return 'Confirmé'; case 'ANNULE': return 'Annulé'; default: return s; } }
  statutColor(s: Rdv['statut']){ return { 'text-emerald-600': s==='CONFIRME', 'text-red-600': s==='ANNULE' }; }
}

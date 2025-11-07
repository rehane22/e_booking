import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RendezVousApi, Rdv, RdvStatut } from '../../../core/api/rendezvous.api';
import { PrestataireApi, PrestataireMe } from '../../../core/api/prestataire.api';

type RowVM = Rdv & { 
  dateLabel: string;
  heureFin: string;
  badgeClass: string;
};

@Component({
  standalone: true,
  imports:[CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './rendezvous.page.html',
})
export class RendezvousPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(RendezVousApi);
  private proApi = inject(PrestataireApi);

  me!: PrestataireMe;
  services: { id: number|string; nom: string; dureeMin?: number }[] = [];

  filters = this.fb.group({ date: [''], statut: [''] });

  rdvs: RowVM[] = [];
  futurs: RowVM[] = [];
  passes: RowVM[] = [];
  pastOpen = false;


  editingId: string|number|null = null;
  edit: { date: string; heure: string; serviceId: number|string|null } = { date: '', heure: '', serviceId: null };

  ngOnInit() {
    this.proApi.me().subscribe(me => {
      this.me = me;
      this.services = (me.services || []).map((s: any) => ({ id: s.id, nom: s.nom, dureeMin: s.dureeMin }));
      this.load();
    });
  }

  apply() { this.load(); }
  clear() { this.filters.reset({ date: '', statut: '' }); this.load(); }

  load() {
    const qDate = this.filters.value.date || undefined;
    this.api.listByPrestataire(this.me.id, qDate as string|undefined).subscribe(list => {

      const now = new Date();
      const todayStr = now.toISOString().slice(0,10);

      const mapped: RowVM[] = list
        .filter(r => this.filters.value.statut ? r.statut === this.filters.value.statut : true)
        .map(r => {
          const dateLabel = this.formatFr(r.date);
          const duree = r.serviceDureeMin ?? this.serviceDuration(r.serviceId) ?? 60;
          const heureFin = this.addMinutes(r.date, r.heure, duree);
          return { ...r, dateLabel, heureFin, badgeClass: this.badgeClass(r.statut) };
        })
     
        .sort((a,b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));


      const [fut, pas] = [[], []] as [RowVM[], RowVM[]];
      for (const r of mapped) {
        if (r.date > todayStr || (r.date === todayStr && r.heure >= now.toTimeString().slice(0,5))) fut.push(r);
        else pas.push(r);
      }
      this.rdvs = mapped;
      this.futurs = fut;
      this.passes = pas;
    });
  }


  confirmer(r: RowVM) {
    this.api.confirmer(r.id).subscribe({
      next: nr => { r.statut = nr.statut; r.badgeClass = this.badgeClass(r.statut); this.load(); },
      error: e => alert('Confirmation impossible: ' + (e.error?.message ?? e.status))
    });
  }

  refuser(r: RowVM) {
    if (!confirm('Refuser ce rendez-vous ? Le créneau sera libéré.')) return;
    this.api.refuser(r.id).subscribe({
      next: nr => { r.statut = nr.statut; r.badgeClass = this.badgeClass(r.statut); this.load(); },
      error: e => alert('Refus impossible: ' + (e.error?.message ?? e.status))
    });
  }

  annuler(r: RowVM) {
    if (!confirm('Annuler ce rendez-vous confirmé ?')) return;
    this.api.annuler(r.id).subscribe({
      next: nr => { r.statut = nr.statut; r.badgeClass = this.badgeClass(r.statut); this.load(); },
      error: e => alert('Annulation impossible: ' + (e.error?.message ?? e.status))
    });
  }

  toggleEdit(r: RowVM) {
    if (this.editingId === r.id) return this.cancelEdit();
    this.editingId = r.id;
    this.edit = { date: r.date, heure: r.heure, serviceId: r.serviceId };
  }
  canSaveEdit() {
    return !!this.edit.date && !!this.edit.heure && !!this.edit.serviceId;
  }
  saveEdit(r: RowVM) {
    if (!this.canSaveEdit()) return;
    this.api.modifier(r.id, {
      date: this.edit.date,
      heure: this.edit.heure,
      serviceId: this.edit.serviceId!
    }).subscribe({
      next: nr => { this.cancelEdit(); this.load(); },
      error: e => alert('Modification impossible: ' + (e.error?.message ?? e.status))
    });
  }
  cancelEdit() { this.editingId = null; this.edit = { date: '', heure: '', serviceId: null }; }


  formatFr(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00');
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(d);
  }
  addMinutes(dateISO: string, hhmm: string, minutes: number): string {
    const [H,M] = hhmm.split(':').map(Number);
    const d = new Date(dateISO + 'T00:00:00');
    d.setHours(H, M + minutes, 0, 0);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  serviceDuration(serviceId: number|string) {
    return this.services.find(s => s.id === serviceId)?.dureeMin;
  }
  badgeClass(statut: RdvStatut) {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-amber-100 text-amber-900';
      case 'CONFIRME':   return 'bg-emerald-100 text-emerald-900';
      case 'ANNULE':     return 'bg-gray-200 text-gray-700';
      case 'REFUSE':     return 'bg-rose-100 text-rose-900';
      default:           return '';
    }
  }
  labelStatut(s: RdvStatut) {
    return s === 'EN_ATTENTE' ? 'En attente'
         : s === 'CONFIRME'   ? 'Confirmé'
         : s === 'ANNULE'     ? 'Annulé'
         : s === 'REFUSE'     ? 'Refusé'
         : s;
  }
}

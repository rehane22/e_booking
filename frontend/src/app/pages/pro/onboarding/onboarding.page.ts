import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ServiceCatalogApi, ServiceItem } from '../../../core/api/service-catalog.api';
import { PrestataireApi } from '../../../core/api/prestataire.api';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="max-w-3xl mx-auto space-y-4">
    <div class="flex items-center justify-between mt-4">
      <h1 class="text-2xl font-semibold">Onboarding prestataire</h1>
      <button routerLink="/pro" class="btn-ghost h-10">Ignorer</button>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()" class="card p-6 space-y-4">
      <div class="grid md:grid-cols-2 gap-3">
        <input class="input" placeholder="Spécialité (ex: Onglerie)" formControlName="specialite">
        <input class="input" placeholder="Adresse (ex: 10 Rue…)" formControlName="adresse">
      </div>

      <div>
        <p class="text-sm font-medium mb-2">Services proposés</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          @for (s of services; track s.id) {
            <label class="card p-3 flex items-center gap-2">
              <input type="checkbox" [value]="s.id" (change)="toggle(s.id, $event.target)">
              <span class="text-sm">{{ s.nom }}</span>
            </label>
          } @empty { <div class="text-sm text-muted">Aucun service.</div> }
        </div>
      </div>

      <button class="btn-primary h-12 w-full md:w-auto"
              type="submit"
              [disabled]="form.invalid || selectedServiceIds.length===0">
        Créer mon profil pro
      </button>
    </form>
  </div>
  `
})
export class OnboardingPage implements OnInit {
  private fb = inject(FormBuilder);
  private servicesApi = inject(ServiceCatalogApi);
  private proApi = inject(PrestataireApi);
  private router = inject(Router);

  form = this.fb.group({
    specialite: ['', [Validators.required, Validators.minLength(2)]],
    adresse: ['', [Validators.required]],
  });

  services: ServiceItem[] = [];
  selectedServiceIds: (string|number)[] = [];

  ngOnInit() {
    this.servicesApi.findAll().subscribe(s => this.services = s);
  }

  toggle(id: string|number, el: any) {
    if (el.checked) this.selectedServiceIds = [...this.selectedServiceIds, id];
    else this.selectedServiceIds = this.selectedServiceIds.filter(x => x !== id);
  }

  submit() {
    if (this.form.invalid || this.selectedServiceIds.length===0) return;
    const { specialite, adresse } = this.form.value;
    this.proApi.onboarding({ specialite: specialite!, adresse: adresse!, serviceIds: this.selectedServiceIds })
      .subscribe({
        next: () => this.router.navigateByUrl('/pro'),
        error: (e) => alert('Onboarding échoué: ' + (e.error?.message ?? e.status))
      });
  }
}

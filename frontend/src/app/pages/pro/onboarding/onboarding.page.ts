import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ServiceCatalogApi, ServiceItem } from '../../../core/api/service-catalog.api';
import { PrestataireApi } from '../../../core/api/prestataire.api';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.page.html',
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

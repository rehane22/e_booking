import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true, imports:[CommonModule],
  template: `
  <div class="max-w-6xl mx-auto mt-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Monitoring</h1>
      <button class="btn-primary h-10">Gérer le catalogue</button>
    </div>
    <div class="grid md:grid-cols-3 gap-6 mt-6">
      <div class="card p-6">Prestataires / service</div>
      <div class="card p-6">RDV par date</div>
      <div class="card p-6">/actuator/health</div>
    </div>
  </div>
  `
})
export class MonitoringPage {}

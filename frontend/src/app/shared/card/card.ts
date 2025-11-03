import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="card p-4 flex gap-4">
    @if (avatar) { <img [src]="avatar!" class="h-14 w-14 rounded-xl object-cover" /> }
    <div class="flex-1">
      <p class="font-semibold">{{ title }}</p>
      @if (subtitle) { <p class="text-xs text-muted">{{ subtitle }}</p> }
      @if (meta) { <p class="text-xs text-muted">{{ meta }}</p> }

      <div class="mt-3 flex gap-2">
        @if (secondaryLink) { <a [routerLink]="secondaryLink" class="btn-ghost h-9">{{ secondaryLabel }}</a> }
        @if (primaryLink)   { <a [routerLink]="primaryLink" class="btn-primary h-9">{{ primaryLabel }}</a> }
      </div>
    </div>
  </div>
  `
})
export class CardComponent {
  @Input() avatar?: string;
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() meta?: string;
  @Input() primaryLink?: any[] | string;
  @Input() primaryLabel = 'Voir';
  @Input() secondaryLink?: any[] | string;
  @Input() secondaryLabel = 'Profil';
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';


@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ],
  template: `
  <header class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-black/5">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <button routerLink="/" class="flex items-center gap-2">
        <div class="h-9 w-9 rounded-xl bg-primary text-white grid place-items-center font-bold">E</div>
        <span class="font-semibold text-base">E-Booking</span>
      </button>

      @if (!isLoggedIn()) {
        <div class="flex gap-2">
          <button routerLink="/auth/login" class="btn-ghost h-10 px-4">Se connecter</button>
          <button routerLink="/auth/register" class="btn-primary h-10 px-4">Créer un compte</button>
        </div>
      } @else {
        <nav class="hidden md:flex items-center gap-2">

          @if (has('CLIENT')) { <button routerLink="/services" class="btn-ghost h-10 px-3">Catalogue</button> }
          @if (has('PRO'))    { <button routerLink="/pro" class="btn-ghost h-10 px-3">Espace Pro</button> }
          @if (has('ADMIN'))  { <button routerLink="/admin/dashboard" class="btn-ghost h-10 px-3">Admin</button> }
          <button routerLink="/mon-compte" class="btn-primary h-10 px-4"><mat-icon fontSet="material-icons-outlined">visibility</mat-icon></button>
          

          <button class="btn-primary h-10 px-4" (click)="logout()">Déconnexion</button>
        </nav>

       
      }
    </div>
  </header>
  `
})
export class TopbarComponent {
  private router = inject(Router);
  isLoggedIn() { return !!localStorage.getItem('accessToken'); }
  has(role: string) { try { return (JSON.parse(localStorage.getItem('roles') || '[]') as string[]).includes(role); } catch { return false; } }
  logout() { localStorage.clear(); this.router.navigateByUrl('/'); }
}

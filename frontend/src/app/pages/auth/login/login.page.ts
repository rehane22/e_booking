import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold mt-6 mb-4">Connexion</h1>
    <form (ngSubmit)="submit()" class="card p-5 space-y-3">
      <input class="input" placeholder="Email" [(ngModel)]="email" name="email" autocomplete="email">
      <input class="input" placeholder="Mot de passe" type="password" [(ngModel)]="password" name="password" autocomplete="current-password">
      <button class="btn-primary w-full h-11" type="submit">Connexion</button>
      <div class="text-xs text-muted">Astuce : coche “Je suis prestataire” lors de l’inscription pour l’espace Pro.</div>
    </form>
  </div>
  `
})
export class LoginPage {
  email=''; password='';
  constructor(private auth: AuthService) {}
  submit(){ this.auth.doLogin(this.email,this.password); }
}

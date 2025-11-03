import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold mt-6 mb-4">Inscription</h1>
    <form (ngSubmit)="submit()" class="card p-5 space-y-3">
      <input class="input" placeholder="Prénom" [(ngModel)]="prenom" name="prenom">
      <input class="input" placeholder="Nom" [(ngModel)]="nom" name="nom">
      <input class="input" placeholder="Email" [(ngModel)]="email" name="email" autocomplete="email">
      <input class="input" placeholder="Téléphone" [(ngModel)]="telephone" name="telephone">
      <input class="input" type="password" placeholder="Mot de passe" [(ngModel)]="password" name="password" autocomplete="new-password">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" [(ngModel)]="isPro" name="isPro"> Je suis prestataire
      </label>
      <button class="btn-primary w-full h-11" type="submit">Créer</button>
    </form>
  </div>
  `
})
export class RegisterPage {
  prenom=''; nom=''; email=''; telephone=''; password=''; isPro=false;
  constructor(private auth: AuthService) {}
  submit(){ this.auth.doRegister({ prenom:this.prenom, nom:this.nom, email:this.email, telephone:this.telephone, password:this.password, isPro:this.isPro }); }
}

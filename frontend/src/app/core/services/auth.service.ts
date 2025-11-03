import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../api/auth.api';
import { PrestataireApi } from '../api/prestataire.api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private api = inject(AuthApi);
  private proApi = inject(PrestataireApi);

  doLogin(email: string, password: string) {
    this.api.login({ email, password }).subscribe({
      next: (res) => this.afterAuth(res),
      error: (e) => alert('Login échoué: ' + (e.error?.message ?? e.status))
    });
  }

  doRegister(body: any) {
    this.api.register(body).subscribe({
      next: (res) => this.afterAuth(res),
      error: (e) => alert('Inscription échouée: ' + (e.error?.message ?? e.status))
    });
  }

  private afterAuth(res: any) {
    // 1) Stocker le token + rôles
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('roles', JSON.stringify(res.roles ?? []));
    const roles: string[] = res.roles ?? [];

    // 2) Cas PRO : redirection immédiate vers l’onboarding
    if (roles.includes('PRO')) {
      // On pousse tout de suite l’utilisateur vers l’onboarding
      this.router.navigateByUrl('/pro/onboarding');

      // 3) Vérif asynchrone : si un profil existe déjà, on remplace par /pro
      this.proApi.me().subscribe({
        next: () => this.router.navigateByUrl('/pro', { replaceUrl: true }),
        error: (e) => {
          // 404 => pas de profil => on reste sur /pro/onboarding
          // autre erreur => on ne bouge pas (ou log si besoin)
          if (e?.status !== 404) {
            console.warn('Erreur /prestataires/me:', e);
          }
        }
      });
      return;
    }

    // 4) Cas ADMIN
    if (roles.includes('ADMIN')) {
      this.router.navigateByUrl('/admin/monitoring');
      return;
    }

    // 5) Cas CLIENT “seulement”
    this.router.navigateByUrl('/services');
  }

  logout() { localStorage.clear(); this.router.navigateByUrl('/'); }
}

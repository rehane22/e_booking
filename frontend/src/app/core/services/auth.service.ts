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
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('roles', JSON.stringify(res.roles ?? []));
    const roles: string[] = res.roles ?? [];
    if (roles.includes('PRO')) {
      this.router.navigateByUrl('/pro/onboarding');
      this.proApi.me().subscribe({
        next: () => this.router.navigateByUrl('/pro', { replaceUrl: true }),
        error: (e) => {
        
          if (e?.status !== 404) {
            console.warn('Erreur /prestataires/me:', e);
          }
        }
      });
      return;
    }


    this.router.navigateByUrl('/services');
  }

  logout() { localStorage.clear(); this.router.navigateByUrl('/'); }
}

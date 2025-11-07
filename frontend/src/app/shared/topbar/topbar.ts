import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';


@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule,],
  templateUrl: './topbar.html',
})
export class TopbarComponent {
  private router = inject(Router);
  isLoggedIn() { return !!localStorage.getItem('accessToken'); }
  has(role: string) { try { return (JSON.parse(localStorage.getItem('roles') || '[]') as string[]).includes(role); } catch { return false; } }
  logout() { localStorage.clear(); this.router.navigateByUrl('/'); }
}

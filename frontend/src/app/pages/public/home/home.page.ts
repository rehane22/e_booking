import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.page.html'
})
export class HomePage implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let roles: string[] = [];
    try { roles = JSON.parse(localStorage.getItem('roles') || '[]'); } catch {}

    if (roles.includes('ADMIN')) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/services']); 
    }
  }
}

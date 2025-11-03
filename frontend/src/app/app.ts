import { Component } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from './shared/topbar/topbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TopbarComponent, RouterOutlet],
  templateUrl: './app.html'
})
export class App {
  isLoggedIn(){ return !!localStorage.getItem('accessToken'); }
  has(role: string){ try { return (JSON.parse(localStorage.getItem('roles')||'[]') as string[]).includes(role); } catch { return false; } }
}

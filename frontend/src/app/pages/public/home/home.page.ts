import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.page.html'
})
export class HomePage {
  isLoggedIn(){ return !!localStorage.getItem('accessToken'); }
}

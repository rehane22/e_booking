import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.page.html',
})
export class RegisterPage {
  prenom=''; nom=''; email=''; telephone=''; password=''; isPro=false;
  constructor(private auth: AuthService) {}
  submit(){ this.auth.doRegister({ prenom:this.prenom, nom:this.nom, email:this.email, telephone:this.telephone, password:this.password, isPro:this.isPro }); }
}

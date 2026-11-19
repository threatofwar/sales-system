import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  constructor(public auth: AuthService) {}

  login(): void {
    this.auth.loginWithRedirect({
      appState: { target: '/dashboard' }
    });
  }

  logout(): void {
    this.auth.logout({
      logoutParams: { returnTo: 'http://localhost:4201/login' }
    });
  }
}

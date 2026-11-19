import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  constructor(private authService: AuthService) {}

  // logout() {
  //   this.authService.logout();
  // }

  logout() {
    this.authService.logout().subscribe({
      next: () => console.log('Logout successful'),
      error: (err) => console.error('Logout failed', err)
    });
  }
}

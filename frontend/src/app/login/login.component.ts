import { Component } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth/auth.service';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isSubmitting: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.username || !this.password) {
      console.warn('Username and password are required');
      return;
    }

    this.isSubmitting = true;

    this.authService.login(this.username, this.password).pipe(
      // switchMap(() => this.authService.isAuthenticated())
      switchMap(() => this.authService.checkAuthentication())
    ).subscribe({
      next: (authenticated) => {
        if (authenticated) {
          this.router.navigate(['/dashboard']);
        } else {
          console.error('Authentication failed');
        }
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('An error occurred', err);
        this.handleError(err);
        this.isSubmitting = false;
      }
    });
  }

  handleError(err: any) {
    switch (err.status) {
      case 502:
        console.warn('Host unreachable');
        this.errorMessage = 'Host unreachable.';
        break;
      case 401:
        console.warn('Incorrect credentials');
        this.errorMessage = 'Incorrect credentials.';
        break;
      default:
        console.warn('An unexpected error occurred');
    }
  }
}

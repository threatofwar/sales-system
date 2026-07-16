import { Component } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ForgotPasswordService } from '../core/forgot-password/forgot-password.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {

  constructor(private forgotPasswordService: ForgotPasswordService) {}

  forgotPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email,]),
  }
  );
  passwordResetToken: string | null = null;

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      console.error('Invalid form data:', this.forgotPasswordForm.value);
      return;
    }

    const email = this.forgotPasswordForm.get('email')?.value;
    if (email) {
      this.forgotPasswordService.getPasswordResetToken(email).subscribe({
        next: (response) => {
          console.log('Password reset token received:', response.password_reset_token);
          this.passwordResetToken = response.password_reset_token;
        },
        error: (error) => {
          console.error('Error during password reset:', error);
        }
      });
    }
  }

}

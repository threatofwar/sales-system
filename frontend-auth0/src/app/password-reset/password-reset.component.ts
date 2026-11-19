import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ForgotPasswordService } from '../core/forgot-password/forgot-password.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-password-reset',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.scss'
})
export class PasswordResetComponent implements OnInit {

  passwordResetTokenForm = new FormGroup({
    password: new FormControl('', [Validators.required, Validators.minLength(1)]),
    re_password: new FormControl('', Validators.required),
  }, { validators: this.passwordsMatchValidator as ValidatorFn });

  passwordResetToken: string | null = null;
  successMessage: string | null = null;

  constructor(private route: ActivatedRoute, private forgotPasswordService: ForgotPasswordService, private router: Router,) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.passwordResetToken = params['password_reset_token'];
      console.log('Token:', this.passwordResetToken);
    });
  }

  onSubmit(): void {
    if (this.passwordResetTokenForm.invalid) {
      console.error('Form is invalid');
      return;
    }

    const password = this.passwordResetTokenForm.value.password || '';

    const formData = {
      password_reset_token: this.passwordResetToken,
      new_password: password,
    };
    console.log('Form submitted:', formData);

    this.forgotPasswordService.resetPassword(formData).subscribe({
      next: (response) => {
        // console.log('Password reset successful:', response);
        this.successMessage = 'Your password has been successfully reset. You can now log in.';
        this.passwordResetTokenForm.reset();
        
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Password reset failed:', error.error.error);
        if (error.error && error.error.error === 'Reset token has already been used') {
          alert('This reset token has already been used. Please request a new one.');
        } else {
          alert('Password reset failed. Please try again later.');
        }
      },
    });
  }

  passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const re_password = group.get('re_password')?.value;
    if (!password || !re_password) {
      return null;
    }
    return password === re_password ? null : { mismatch: true };
  }
}

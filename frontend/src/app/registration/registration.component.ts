import { Component } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators, ValidationErrors, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { RegistrationService } from '../core/registration/registration.service';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-registration',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss'
})
export class RegistrationComponent {

  profileForm = new FormGroup({
    username: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
    re_password: new FormControl('', Validators.required),
    first_name: new FormControl(''),
    last_name: new FormControl(''),
  }, { validators: this.passwordsMatchValidator });

  usernameAvailable: boolean | null = null;
  usernameCheckInProgress: boolean = false;
  passwordsMismatch: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private registrationService: RegistrationService,
    private authService: AuthService
  ) {
    this.profileForm.get('username')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter((username): username is string => username !== null),
        switchMap((username) => this.registrationService.checkUsernameAvailability(username))
      )
      .subscribe((response) => {
        this.usernameAvailable = response.available;
        this.usernameCheckInProgress = false;
      });

    this.profileForm.get('password')?.valueChanges.subscribe(() => this.checkPasswords());
    this.profileForm.get('re_password')?.valueChanges.subscribe(() => this.checkPasswords());
  }

  checkPasswords() {
    const password = this.profileForm.get('password')?.value;
    const rePassword = this.profileForm.get('re_password')?.value;
    this.passwordsMismatch = password !== rePassword;
  }

  passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const formGroup = control as FormGroup;
    const password = formGroup.get('password')?.value;
    const rePassword = formGroup.get('re_password')?.value;

    return password === rePassword ? null : { passwordsMismatch: true };
  }

  handleSubmit() {
    if (this.profileForm.invalid) {
      console.error('Form is invalid or passwords do not match.');
      return;
    }

    const formData = this.profileForm.value;

    const postData = {
      username: formData.username,
      password: formData.password,
      re_password: formData.re_password,
      emails: [formData.email]
    };

    this.registrationService.registerUser(postData).subscribe(
      (response) => {
        console.log('User registered successfully:', response);

        const username = postData.username || '';
        const password = postData.password || '';

        this.authService.login(username, password).subscribe(
          (loginResponse) => {
            console.log('Login successful:', loginResponse);
            this.router.navigate(['/dashboard']);
          },
          (error) => {
            console.error('Login failed after registration:', error);
          }
        );
      },
      (error) => {
        console.error('Error during registration:', error);
      }
    );
  }

  handleCancel() {
    this.router.navigate(['']);
  }
}

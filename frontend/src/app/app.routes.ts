import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RegistrationComponent } from './registration/registration.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { DashboardComponent } from './auth/dashboard/dashboard.component';
import { authGuard } from './core/auth/auth.guard';
import { publicGuard } from './core/auth/public.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent, canActivate: [publicGuard] },
    { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
    { path: 'registration', component: RegistrationComponent, canActivate: [publicGuard] },
    { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [publicGuard] },
    { path: 'password-reset', component: PasswordResetComponent, canActivate: [publicGuard] },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
];

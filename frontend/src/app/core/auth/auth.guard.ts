import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.isAuthenticated().pipe(
    // return authService.checkAuthentication().pipe(
    map(authenticated => {

      if (!authenticated && route.routeConfig?.path === 'dashboard') {
        router.navigate(['/login']);
        return false;
      }

      return true;
    })
  );
};
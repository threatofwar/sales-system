import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../../core/session/session.service';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export const publicGuard: CanActivateFn = (route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  const authService = inject(AuthService);

  const session = sessionService.getSession();

  if (!session) {
    return true;
  }

  return authService.checkAuthentication().pipe(
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    }),
    catchError((error) => {
      console.error('Error checking authentication:', error);
      router.navigate(['/login']);
      return of(false);
    })
  );
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { catchError, throwError, switchMap} from 'rxjs';


export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);


  return next(req).pipe(

    catchError((error: HttpErrorResponse) => {


      if (
        error.status === 401 &&
        !req.url.includes('/login') &&
        !req.url.includes('/refresh-token')
      ) {


        return authService.refreshToken().pipe(

          switchMap(() => {

            console.log(
              'Token refreshed. Retrying request...'
            );

            return next(req);

          }),


          catchError(() => {

            console.log(
              'Refresh token failed. Redirecting to login...'
            );

            router.navigate(['/login']);

            return throwError(() => error);

          })

        );

      }


      return throwError(() => error);

    })

  );

};
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors  } from '@angular/common/http';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      cacheLocation: 'localstorage',
      authorizationParams: {
        redirect_uri: environment.appUrl,
        audience: environment.auth0.audience
      },
      httpInterceptor: {
        allowedList: [`${environment.apiUrl}/auth/*`]
      }
    }),
    provideHttpClient(withFetch(), withInterceptors([authHttpInterceptorFn]))
  ],
};

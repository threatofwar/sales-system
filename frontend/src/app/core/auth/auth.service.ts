import { environment } from '../../../environments/environment';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { SessionService } from '../session/session.service';
import { isPlatformServer } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authenticatedSubject = new BehaviorSubject<boolean | null>(null);
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private cookieService: CookieService, 
    private sessionService: SessionService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { username, password }, { withCredentials: true }).pipe(
      tap((response: any) => {
        console.log('Login response:', response);
        if (response && response.sessionData) {
          this.sessionService.setSession(response.sessionData);
          this.authenticatedSubject.next(true);
        }
      }),
      catchError(error => {
        return throwError(error);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { responseType: 'json', withCredentials: true }).pipe(
      tap((response) => {
        console.log('Logout response:', response);
        console.log('Logged out successfully');
        
        this.sessionService.clearSession();
        this.authenticatedSubject.next(false);
        localStorage.removeItem('session');
        
        this.router.navigate(['/']);
      }),
      catchError((error) => {
        console.error('Logout failed:', error);
        return throwError(() => new Error('Logout error'));
      })
    );
  }
  
  isAuthenticated(): Observable<boolean> {
    if (this.isPrerendering()) {
      return of(true);
    }
    return this.http.get<{ authenticated: boolean }>(`${this.apiUrl}/authenticated`, { withCredentials: true }).pipe(
      map(response => response.authenticated),
      catchError(() => of(false))
    );
  }

  checkAuthentication(): Observable<boolean> {
    if (this.isPrerendering()) {
      return of(true);
    }
    if (this.authenticatedSubject.value !== null) {
      console.log('cache authentication status: ', this.authenticatedSubject.value);
      return of(this.authenticatedSubject.value);
    }

    console.log('Checking authentication status via API...');
    return this.http.get<{ authenticated: boolean }>(`${this.apiUrl}/authenticated`, { withCredentials: true }).pipe(
      map(response => {
        console.log('Authentication check response:', response);
        this.authenticatedSubject.next(response.authenticated);
        return response.authenticated;
      }),
      catchError(error => {
        console.error('Authentication check failed:', error);
        this.authenticatedSubject.next(false);
        return of(false);
      })
    );
  }

  clearAuthenticationStatus() {
    this.authenticatedSubject.next(null);
  }

  private isPrerendering(): boolean {
    return isPlatformServer(this.platformId);  // This checks if we're in the server-side rendering (prerendering) phase
  }
}

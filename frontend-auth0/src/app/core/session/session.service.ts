import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private sessionKey: string = 'userSession';

  constructor(private http: HttpClient) { }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  setSession(sessionData: any): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }
  }

  getSession(): any {
    if (this.isBrowser()) {
      const sessionData = localStorage.getItem(this.sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    }
    return null;
  }

  clearSession(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.sessionKey);
    }
  }
}

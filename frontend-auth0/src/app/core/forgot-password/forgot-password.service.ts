import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ForgotPasswordService {

  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getPasswordResetToken(email: string): Observable<any> {
    return this.http.post(this.apiUrl + '/forgot-password', { email });
  }

  resetPassword(formData: { password_reset_token: string | null; new_password: string }): Observable<any> {
    console.log(formData)
    return this.http.post(this.apiUrl + '/reset-password', formData);
  }
}

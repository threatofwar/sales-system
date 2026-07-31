import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CustomerEmail {
  id?: number;
  customer_id?: number;
  email: string;
  is_primary: boolean;
  created_at?: string;
}

export interface Customer {
  id?: number;
  type?: string;
  display_name?: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  identification_no?: string;
  registration_no?: string;
  phone: string;
  address: string;

  emails: CustomerEmail[];

  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8080/auth/customers';

  constructor() { }

  /**
   * Get all customers
   */
  
  getCustomers(): Observable<Customer[]> {
        return this.http.get<Customer[]>(
            this.apiUrl,
            {
            withCredentials: true
            }
        );
    }

  /**
   * Get customer by ID
   */
  getCustomer(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`,
      {
        withCredentials: true
      }
    );
  }

  /**
   * Create customer
   */
  createCustomer(customer: Customer): Observable<Customer> {
  return this.http.post<Customer>(
    this.apiUrl,
    customer,
    {
      withCredentials: true
    }
  );
}

  /**
   * Update customer
   */
  updateCustomer(id: number, customer: Customer): Observable<Customer> {
  return this.http.put<Customer>(
    `${this.apiUrl}/${id}`,
    customer,
    {
      withCredentials: true
    }
  );
}

  /**
   * Delete customer
   */
  deleteCustomer(id: number): Observable<void> {
  return this.http.delete<void>(
    `${this.apiUrl}/${id}`,
    {
      withCredentials: true
    }
  );
}
}
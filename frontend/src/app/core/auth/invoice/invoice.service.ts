import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;

  product_id: number;
  product_name?: string;

  quantity: number;

  unit_price?: string | number;
  discount?: string | number;
  total?: string | number;
}

export interface Invoice {
  id?: number;

  customer_id: number;
  customer_name?: string;

  invoice_number: string;

  invoice_date: string;
  due_date?: string;

  status: string;

  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;

  notes?: string;

  created_at?: string;
  updated_at?: string;

  items?: InvoiceItem[];
}

/*
 * Some backend responses may return:
 *
 * {
 *   invoice: { ... }
 * }
 *
 * while others may return:
 *
 * {
 *   id: 1,
 *   invoice_number: "...",
 *   ...
 * }
 */
export interface InvoiceResponse {
  invoice: Invoice;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) {}


  // ============================================================
  // Get All Invoices
  // ============================================================

  getInvoices(): Observable<Invoice[] | { invoices: Invoice[] }> {

    return this.http.get<Invoice[] | { invoices: Invoice[] }>(
      `${this.apiUrl}/auth/invoice`,
      {
        withCredentials: true
      }
    );

  }


  // ============================================================
  // Get Invoice By ID
  // ============================================================

  getInvoice(
    id: number
  ): Observable<Invoice | InvoiceResponse> {

    return this.http.get<Invoice | InvoiceResponse>(
      `${this.apiUrl}/auth/invoice/${id}`,
      {
        withCredentials: true
      }
    );

  }


  // ============================================================
  // Create Invoice
  // ============================================================

  createInvoice(
    invoice: any
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/auth/invoice`,
      invoice,
      {
        withCredentials: true
      }
    );

  }


  // ============================================================
  // Update Invoice
  // ============================================================

  updateInvoice(
    id: number,
    invoice: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/auth/invoice/${id}`,
      invoice,
      {
        withCredentials: true
      }
    );

  }


  // ============================================================
  // Delete Invoice
  // ============================================================

  deleteInvoice(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/auth/invoice/${id}`,
      {
        withCredentials: true
      }
    );

  }

}
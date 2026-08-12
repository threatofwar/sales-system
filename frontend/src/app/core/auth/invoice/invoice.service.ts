import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';


// ============================================================
// Invoice Item
// ============================================================

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


// ============================================================
// Invoice
// ============================================================

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

  /*
   * Items are optional because the paginated
   * invoice list does not return invoice items.
   *
   * GET /auth/invoice/:id returns the items.
   */
  items?: InvoiceItem[];

}


// ============================================================
// Single Invoice Response
// ============================================================

export interface InvoiceResponse {

  invoice: Invoice;

}


// ============================================================
// Pagination
// ============================================================

export interface InvoicePagination {

  page: number;

  page_size: number;

  total: number;

  total_pages: number;

}


// ============================================================
// Paginated Invoice Response
// ============================================================

export interface InvoiceListResponse {

  invoices: Invoice[];

  pagination: InvoicePagination;

}


// ============================================================
// Invoice Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {


  private apiUrl =
    environment.apiUrl;


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // Get Paginated Invoices
  // ==========================================================

  getInvoices(
    page: number = 1,
    pageSize: number = 20
  ): Observable<InvoiceListResponse> {


    /*
     * Build:
     *
     * ?page=1&page_size=20
     */
    const params =
      new HttpParams()
        .set(
          'page',
          page.toString()
        )
        .set(
          'page_size',
          pageSize.toString()
        );


    return this.http.get<InvoiceListResponse>(
      `${this.apiUrl}/auth/invoice`,
      {
        params,
        withCredentials: true
      }
    );

  }


  // ==========================================================
  // Get Invoice By ID
  // ==========================================================

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


  // ==========================================================
  // Create Invoice
  // ==========================================================

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


  // ==========================================================
  // Update Invoice
  // ==========================================================

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


  // ==========================================================
  // Delete Invoice
  // ==========================================================

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
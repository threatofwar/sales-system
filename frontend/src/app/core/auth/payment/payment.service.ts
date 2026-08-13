import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';


// ============================================================
// Payment Method
// ============================================================

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'E_WALLET'
  | 'OTHER';


// ============================================================
// Payment
// ============================================================

export interface Payment {

  id?: number;

  invoice_id: number;

  amount: string | number;

  payment_method:
    PaymentMethod | string;

  payment_date: string;

  reference_no?: string | null;

  notes?: string | null;

  created_at?: string;

  updated_at?: string;

  invoice_number?: string;

  invoice_total?: string | number;

  invoice_status?: string;

  customer_id?: number;

  customer_name?: string;

}


// ============================================================
// Create Payment
// ============================================================

export interface CreatePaymentRequest {

  invoice_id: number;

  amount: string;

  payment_method: PaymentMethod;

  payment_date?: string;

  reference_no?: string | null;

  notes?: string | null;

}


export interface CreatePaymentResponse {

  message: string;

  payment: Payment;

}


// ============================================================
// Invoice Payment Summary
// ============================================================

export interface InvoicePaymentSummary {

  invoice_id: number;

  invoice_number: string;

  invoice_total: string | number;

  amount_paid: string | number;

  outstanding_balance:
    string | number;

  status: string;

  payments: Payment[];

}


export interface PaymentSummaryResponse {

  payment_summary:
    InvoicePaymentSummary;

}


// ============================================================
// Pagination
// ============================================================

export interface PaymentPagination {

  page: number;

  page_size: number;

  total: number;

  total_pages: number;

}


export interface PaymentListResponse {

  payments: Payment[];

  pagination: PaymentPagination;

}


// ============================================================
// Sorting
// ============================================================

export type PaymentSortBy =
  | 'payment_date'
  | 'amount'
  | 'invoice_number'
  | 'customer'
  | 'payment_method'
  | 'reference_no'
  | 'created_at';


export type PaymentSortOrder =
  | 'asc'
  | 'desc';


// ============================================================
// Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private apiUrl =
    environment.apiUrl;


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // Get Paginated Payments
  // ==========================================================

  getPayments(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    paymentMethod: string = '',
    sortBy: PaymentSortBy = 'payment_date',
    sortOrder: PaymentSortOrder = 'desc'
  ): Observable<PaymentListResponse> {

    let params =
      new HttpParams()
        .set(
          'page',
          page.toString()
        )
        .set(
          'page_size',
          pageSize.toString()
        )
        .set(
          'sort_by',
          sortBy
        )
        .set(
          'sort_order',
          sortOrder
        );


    const cleanedSearch =
      search.trim();

    if (cleanedSearch) {

      params =
        params.set(
          'search',
          cleanedSearch
        );

    }


    const cleanedMethod =
      paymentMethod
        .trim()
        .toUpperCase();

    if (cleanedMethod) {

      params =
        params.set(
          'payment_method',
          cleanedMethod
        );

    }


    return this.http.get<PaymentListResponse>(
      `${this.apiUrl}/auth/payment`,
      {
        params,
        withCredentials: true
      }
    );

  }


  // ==========================================================
  // Get Payment By ID
  // ==========================================================

  getPayment(
    id: number
  ): Observable<{
    payment: Payment
  }> {

    return this.http.get<{
      payment: Payment
    }>(
      `${this.apiUrl}/auth/payment/${id}`,
      {
        withCredentials: true
      }
    );

  }


  // ==========================================================
  // Get Invoice Payment Summary
  // ==========================================================

  getInvoicePaymentSummary(
    invoiceId: number
  ): Observable<PaymentSummaryResponse> {

    return this.http.get<PaymentSummaryResponse>(
      `${this.apiUrl}/auth/payment/invoice/${invoiceId}`,
      {
        withCredentials: true
      }
    );

  }


  // ==========================================================
  // Create Payment
  // ==========================================================

  createPayment(
    payment: CreatePaymentRequest
  ): Observable<CreatePaymentResponse> {

    return this.http.post<CreatePaymentResponse>(
      `${this.apiUrl}/auth/payment`,
      payment,
      {
        withCredentials: true
      }
    );

  }

}
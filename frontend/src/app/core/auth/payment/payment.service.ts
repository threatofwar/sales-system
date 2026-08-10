import { Injectable } from '@angular/core';
import {
  HttpClient
} from '@angular/common/http';
import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';


export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'E_WALLET'
  | 'OTHER';


export interface Payment {

  id?: number;

  invoice_id: number;

  amount: string | number;

  payment_method: PaymentMethod | string;

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


export interface InvoicePaymentSummary {

  invoice_id: number;

  invoice_number: string;

  invoice_total: string | number;

  amount_paid: string | number;

  outstanding_balance: string | number;

  status: string;

  payments: Payment[];

}


export interface PaymentSummaryResponse {

  payment_summary: InvoicePaymentSummary;

}


@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private apiUrl =
    environment.apiUrl;


  constructor(
    private http: HttpClient
  ) {}


  /*
   * Retrieve all payments.
   */
  getPayments(): Observable<{
    payments: Payment[]
  }> {

    return this.http.get<{
      payments: Payment[]
    }>(
      `${this.apiUrl}/auth/payment`,
      {
        withCredentials: true
      }
    );

  }


  /*
   * Retrieve one payment.
   */
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


  /*
   * Retrieve payment information for one invoice.
   *
   * Your current backend route is:
   *
   * GET /auth/payment/invoice/:invoice_id
   */
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


  /*
   * Create a payment.
   */
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
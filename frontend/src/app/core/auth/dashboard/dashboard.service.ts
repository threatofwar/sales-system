import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  environment
} from '../../../../environments/environment';


// ============================================================
// Dashboard Models
// ============================================================

export interface DashboardInvoiceCounts {

  draft: number;

  issued: number;

  partial: number;

  paid: number;

  cancelled: number;

}


export interface DashboardRecentInvoice {

  id: number;

  invoice_number: string;

  customer_id: number;

  customer_name: string;

  status: string;

  total: string | number;

  invoice_date: string;

}


export interface DashboardRecentPayment {

  id: number;

  invoice_id: number;

  invoice_number: string;

  customer_name: string;

  amount: string | number;

  payment_method: string;

  payment_date: string;

}


export interface DashboardLowStockProduct {

  id: number;

  name: string;

  sku: string;

  stock_quantity: number;

}


export interface Dashboard {

  total_sales: string | number;

  amount_collected: string | number;

  outstanding_balance: string | number;

  invoice_counts:
    DashboardInvoiceCounts;

  low_stock_count: number;

  recent_invoices:
    DashboardRecentInvoice[];

  recent_payments:
    DashboardRecentPayment[];

  low_stock_products:
    DashboardLowStockProduct[];

}


export interface DashboardResponse {

  dashboard: Dashboard;

}


// ============================================================
// Dashboard Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private apiUrl =
    environment.apiUrl;


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // Get Dashboard
  // ==========================================================

  getDashboard():
    Observable<DashboardResponse> {

    return this.http.get<DashboardResponse>(
      `${this.apiUrl}/auth/dashboard`,
      {
        withCredentials: true
      }
    );

  }

}
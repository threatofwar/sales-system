import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  Dashboard,
  DashboardInvoiceCounts,
  DashboardLowStockProduct,
  DashboardRecentInvoice,
  DashboardRecentPayment,
  DashboardService
} from '../../core/auth/dashboard/dashboard.service';


@Component({
  selector: 'app-dashboard',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './dashboard.component.html',

  styleUrl:
    './dashboard.component.scss'
})
export class DashboardComponent
  implements OnInit {

  dashboard:
    Dashboard | null = null;

  loading =
    false;

  errorMessage =
    '';


  constructor(
    private dashboardService:
      DashboardService,

    private router:
      Router
  ) {}


  // ==========================================================
  // Initialise
  // ==========================================================

  ngOnInit(): void {

    this.loadDashboard();

  }


  // ==========================================================
  // Load Dashboard
  // ==========================================================

  loadDashboard(): void {

    this.loading =
      true;

    this.errorMessage =
      '';

    this.dashboardService
      .getDashboard()
      .subscribe({

        next: response => {

          console.log(
            'Dashboard loaded:',
            response
          );

          this.dashboard =
            response.dashboard;

          this.loading =
            false;

        },

        error: error => {

          console.error(
            'Failed to load dashboard:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to load dashboard.';

          this.loading =
            false;

        }

      });

  }


  // ==========================================================
  // Summary Helpers
  // ==========================================================

  getTotalSales(): number {

    return Number(
      this.dashboard
        ?.total_sales ??
      0
    ) || 0;

  }


  getAmountCollected(): number {

    return Number(
      this.dashboard
        ?.amount_collected ??
      0
    ) || 0;

  }


  getOutstandingBalance(): number {

    return Number(
      this.dashboard
        ?.outstanding_balance ??
      0
    ) || 0;

  }


  getLowStockCount(): number {

    return Number(
      this.dashboard
        ?.low_stock_count ??
      0
    ) || 0;

  }


  // ==========================================================
  // Invoice Counts
  // ==========================================================

  getInvoiceCounts():
    DashboardInvoiceCounts {

    return (
      this.dashboard
        ?.invoice_counts ??
      {
        draft: 0,
        issued: 0,
        partial: 0,
        paid: 0,
        cancelled: 0
      }
    );

  }


  getTotalInvoiceCount(): number {

    const counts =
      this.getInvoiceCounts();

    return (
      counts.draft +
      counts.issued +
      counts.partial +
      counts.paid +
      counts.cancelled
    );

  }


  // ==========================================================
  // Lists
  // ==========================================================

  getRecentInvoices():
    DashboardRecentInvoice[] {

    return (
      this.dashboard
        ?.recent_invoices ??
      []
    );

  }


  getRecentPayments():
    DashboardRecentPayment[] {

    return (
      this.dashboard
        ?.recent_payments ??
      []
    );

  }


  getLowStockProducts():
    DashboardLowStockProduct[] {

    return (
      this.dashboard
        ?.low_stock_products ??
      []
    );

  }


  // ==========================================================
  // Formatting
  // ==========================================================

  formatMoney(
    value:
      string |
      number |
      null |
      undefined
  ): string {

    const amount =
      Number(
        value ??
        0
      );

    if (
      !Number.isFinite(
        amount
      )
    ) {

      return '0.00';

    }

    return amount
      .toFixed(2);

  }


  formatDate(
    value:
      string |
      null |
      undefined
  ): string {

    if (!value) {
      return '-';
    }

    /*
     * Backend dashboard invoice dates currently return:
     *
     * 2026-08-10
     *
     * and payment dates may return:
     *
     * 2026-08-10 00:00:00+00
     */

    const normalizedValue =
      value.includes(' ') &&
      !value.includes('T')
        ? value.replace(
            ' ',
            'T'
          )
        : value;

    const date =
      new Date(
        normalizedValue
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }

    return date.toLocaleDateString(
      'en-MY',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );

  }


  formatPaymentMethod(
    method:
      string |
      null |
      undefined
  ): string {

    if (!method) {
      return '-';
    }

    return method
      .replaceAll(
        '_',
        ' '
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        letter =>
          letter.toUpperCase()
      );

  }


  // ==========================================================
  // Status Styling
  // ==========================================================

  getStatusClass(
    status:
      string |
      null |
      undefined
  ): string {

    switch (
      status
        ?.toUpperCase()
    ) {

      case 'DRAFT':

        return (
          'bg-gray-100 text-gray-700'
        );


      case 'ISSUED':

        return (
          'bg-blue-100 text-blue-700'
        );


      case 'PARTIAL':

        return (
          'bg-orange-100 text-orange-700'
        );


      case 'PAID':

        return (
          'bg-green-100 text-green-700'
        );


      case 'CANCELLED':

        return (
          'bg-red-100 text-red-700'
        );


      default:

        return (
          'bg-gray-100 text-gray-700'
        );

    }

  }


  // ==========================================================
  // Navigation
  // ==========================================================

  viewInvoice(
    invoiceId: number
  ): void {

    this.router.navigate([
      '/invoice',
      invoiceId
    ]);

  }


  viewInvoices(): void {

    this.router.navigate([
      '/invoice'
    ]);

  }


  viewProducts(): void {

    this.router.navigate([
      '/product'
    ]);

  }


  viewStockTransactions(): void {

    this.router.navigate([
      '/stock-transaction'
    ]);

  }

}
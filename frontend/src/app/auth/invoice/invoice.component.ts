import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  Invoice,
  InvoiceService
} from '../../core/auth/invoice/invoice.service';


@Component({
  selector: 'app-invoice',
  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {

  invoices: Invoice[] = [];

  loading = false;

  errorMessage = '';

  deletingInvoiceId: number | null = null;


  constructor(
    private invoiceService: InvoiceService,
    private router: Router
  ) {}


  ngOnInit(): void {

    this.loadInvoices();

  }


  // ==========================================================
  // Load invoices
  // ==========================================================

  loadInvoices(): void {

    this.loading = true;

    this.errorMessage = '';

    this.invoiceService
      .getInvoices()
      .subscribe({

        next: (response) => {

          console.log(
            'Invoices loaded:',
            response
          );

          /*
           * Your backend may return:
           *
           * [
           *   {...},
           *   {...}
           * ]
           *
           * OR:
           *
           * {
           *   "invoices": [...]
           * }
           *
           * Handle both formats.
           */

          if (Array.isArray(response)) {

            this.invoices = response;

          } else {

            this.invoices =
              response.invoices ?? [];

          }

          this.loading = false;

        },


        error: (error) => {

          console.error(
            'Failed to load invoices:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to load invoices.';

          this.loading = false;

        }

      });

  }


  // ==========================================================
  // Create invoice
  // ==========================================================

  createInvoice(): void {

    this.router.navigate([
      '/invoice/new'
    ]);

  }


  // ==========================================================
  // View invoice
  // ==========================================================

  viewInvoice(
    invoice: Invoice
  ): void {

    if (!invoice.id) {
      return;
    }

    this.router.navigate([
      '/invoice',
      invoice.id
    ]);

  }


  // ==========================================================
  // Edit invoice
  // ==========================================================

  editInvoice(
    invoice: Invoice
  ): void {

    if (!invoice.id) {
      return;
    }

    this.router.navigate([
      '/invoice',
      invoice.id,
      'edit'
    ]);

  }


  // ==========================================================
  // Delete invoice
  // ==========================================================

  deleteInvoice(
    invoice: Invoice
  ): void {

    if (!invoice.id) {
      return;
    }


    /*
     * Don't allow deletion of paid/cancelled invoices
     * on the frontend.
     *
     * The backend also validates this.
     */

    if (
      invoice.status === 'PAID' ||
      invoice.status === 'CANCELLED'
    ) {

      alert(
        `A ${invoice.status.toLowerCase()} invoice cannot be deleted.`
      );

      return;

    }


    const confirmed = window.confirm(
      `Are you sure you want to delete invoice ${invoice.invoice_number}?`
    );


    if (!confirmed) {
      return;
    }


    this.deletingInvoiceId = invoice.id;


    this.invoiceService
      .deleteInvoice(invoice.id)
      .subscribe({

        next: () => {

          console.log(
            'Invoice deleted:',
            invoice.id
          );

          this.deletingInvoiceId = null;

          this.loadInvoices();

        },


        error: (error) => {

          console.error(
            'Failed to delete invoice:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to delete invoice.';

          this.deletingInvoiceId = null;

        }

      });

  }


  // ==========================================================
  // Format date
  // ==========================================================

  formatDate(
    date?: string | null
  ): string {

    if (!date) {
      return '-';
    }


    const parsedDate = new Date(date);


    if (isNaN(parsedDate.getTime())) {
      return '-';
    }


    return parsedDate.toLocaleDateString(
      'en-MY',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
    );

  }


  // ==========================================================
  // Format money
  // ==========================================================

  formatMoney(
    value?: string | number | null
  ): string {

    const amount = Number(value ?? 0);


    if (isNaN(amount)) {
      return 'RM 0.00';
    }


    return amount.toLocaleString(
      'en-MY',
      {
        style: 'currency',
        currency: 'MYR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  // ==========================================================
  // Status CSS helper
  // ==========================================================

  getStatusClass(
    status?: string
  ): string {

    switch (
      status?.toUpperCase()
    ) {

      case 'DRAFT':
        return 'status-draft';

      case 'ISSUED':
        return 'status-issued';

      case 'PAID':
        return 'status-paid';

      case 'CANCELLED':
        return 'status-cancelled';

      default:
        return '';

    }

  }


  // ==========================================================
  // Track invoices in *ngFor
  // ==========================================================

  trackByInvoiceId(
    index: number,
    invoice: Invoice
  ): number {

    return invoice.id ?? index;

  }

}
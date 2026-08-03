import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import {
  Invoice,
  InvoiceItem,
  InvoiceResponse,
  InvoiceService
} from '../../../core/auth/invoice/invoice.service';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss'
})
export class InvoiceDetailComponent implements OnInit {

  invoice: Invoice | null = null;

  loading = false;

  errorMessage = '';

  invoiceId = 0;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService
  ) {}


  // ============================================================
  // Initialisation
  // ============================================================

  ngOnInit(): void {

    this.route.paramMap.subscribe(params => {

      const id = Number(
        params.get('id')
      );

      if (!id || id <= 0) {

        this.errorMessage =
          'Invalid invoice ID.';

        return;

      }

      this.invoiceId = id;

      this.loadInvoice();

    });

  }


  // ============================================================
  // Load Invoice
  // ============================================================

  loadInvoice(): void {

    this.loading = true;

    this.errorMessage = '';

    this.invoice = null;


    this.invoiceService
      .getInvoice(this.invoiceId)
      .subscribe({

        next: (response) => {

          console.log(
            'Invoice detail response:',
            response
          );


          /*
           * Backend may return either:
           *
           * 1. Invoice directly
           *
           * {
           *   id: 4,
           *   invoice_number: "INV-2026-0003",
           *   ...
           * }
           *
           * OR
           *
           * 2. Wrapped response
           *
           * {
           *   invoice: {
           *     id: 4,
           *     ...
           *   }
           * }
           */


          if (
            this.isInvoiceResponse(response)
          ) {

            this.invoice =
              response.invoice;

          } else {

            this.invoice =
              response;

          }


          this.loading = false;

        },


        error: (error) => {

          console.error(
            'Failed to load invoice:',
            error
          );


          this.errorMessage =
            error?.error?.error ||
            'Failed to load invoice.';


          this.loading = false;

        }

      });

  }


  // ============================================================
  // Check Wrapped Response
  // ============================================================

  private isInvoiceResponse(
    response: Invoice | InvoiceResponse
  ): response is InvoiceResponse {

    return (
      response !== null &&
      typeof response === 'object' &&
      'invoice' in response
    );

  }


  // ============================================================
  // Get Customer Display
  // ============================================================

  getCustomerId(): string {

    if (!this.invoice) {

      return '-';

    }

    return String(
      this.invoice.customer_id
    );

  }


  // ============================================================
  // Get Invoice Item Total
  // ============================================================

  getItemTotal(
    item: InvoiceItem
  ): number {

    if (
      item.total !== undefined &&
      item.total !== null
    ) {

      return Number(item.total) || 0;

    }


    const quantity =
      Number(item.quantity) || 0;

    const unitPrice =
      Number(item.unit_price) || 0;

    const discount =
      Number(item.discount) || 0;


    return (
      quantity * unitPrice
    ) - discount;

  }


  // ============================================================
  // Format Money
  // ============================================================

  formatMoney(
    value: string | number | null | undefined
  ): string {

    const amount =
      Number(value) || 0;

    return amount.toFixed(2);

  }


  // ============================================================
  // Format Date
  // ============================================================

  formatDate(
    value: string | null | undefined
  ): string {

    if (!value) {

      return '-';

    }


    const date =
      new Date(value);


    if (isNaN(date.getTime())) {

      return value;

    }


    return date.toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    );

  }


  // ============================================================
  // Edit Invoice
  // ============================================================

  editInvoice(): void {

    if (!this.invoice?.id) {

      return;

    }


    this.router.navigate([
      '/invoice',
      this.invoice.id,
      'edit'
    ]);

  }


  // ============================================================
  // Back To Invoice List
  // ============================================================

  backToInvoices(): void {

    this.router.navigate([
      '/invoice'
    ]);

  }


  // ============================================================
  // Print Invoice
  // ============================================================

  printInvoice(): void {

    window.print();

  }

}
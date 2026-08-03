import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  Invoice,
  InvoiceService
} from '../../core/auth/invoice/invoice.service';

@Component({
  selector: 'app-invoice',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {

  invoices: Invoice[] = [];

  loading = false;

  errorMessage = '';

  constructor(
    private invoiceService: InvoiceService
  ) {}


  ngOnInit(): void {

    this.loadInvoices();

  }


  loadInvoices(): void {

    this.loading = true;

    this.errorMessage = '';

    this.invoiceService.getInvoices().subscribe({

      next: (response) => {

        console.log(
          'Invoices loaded:',
          response
        );

        this.invoices =
          response.invoices ?? [];

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


  deleteInvoice(id: number): void {

    const confirmed = confirm(
      'Are you sure you want to delete this invoice?'
    );

    if (!confirmed) {
      return;
    }

    this.invoiceService.deleteInvoice(id).subscribe({

      next: () => {

        console.log(
          'Invoice deleted:',
          id
        );

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

      }

    });

  }

}
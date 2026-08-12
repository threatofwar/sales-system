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


  // ==========================================================
  // Pagination
  // ==========================================================

  currentPage = 1;

  pageSize = 20;

  totalInvoices = 0;

  totalPages = 0;


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

  loadInvoices(
    page: number = this.currentPage
  ): void {

    if (page < 1) {
      return;
    }

    if (
      this.totalPages > 0 &&
      page > this.totalPages
    ) {
      return;
    }

    this.loading = true;

    this.errorMessage = '';

    this.invoiceService
      .getInvoices(
        page,
        this.pageSize
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Invoices loaded:',
            response
          );

          this.invoices =
            response.invoices ?? [];

          this.currentPage =
            response.pagination.page;

          this.pageSize =
            response.pagination.page_size;

          this.totalInvoices =
            response.pagination.total;

          this.totalPages =
            response.pagination.total_pages;

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
  // Pagination Navigation
  // ==========================================================

  previousPage(): void {

    if (
      this.currentPage <= 1 ||
      this.loading
    ) {
      return;
    }

    this.loadInvoices(
      this.currentPage - 1
    );

  }


  nextPage(): void {

    if (
      this.currentPage >= this.totalPages ||
      this.loading
    ) {
      return;
    }

    this.loadInvoices(
      this.currentPage + 1
    );

  }


  goToPage(
    page: number
  ): void {

    if (
      page < 1 ||
      page > this.totalPages ||
      page === this.currentPage ||
      this.loading
    ) {
      return;
    }

    this.loadInvoices(
      page
    );

  }


  // ==========================================================
  // Pagination Display Helpers
  // ==========================================================

  getFirstRecordNumber(): number {

    if (
      this.totalInvoices === 0
    ) {
      return 0;
    }

    return (
      (
        this.currentPage - 1
      ) *
      this.pageSize
    ) + 1;

  }


  getLastRecordNumber(): number {

    if (
      this.totalInvoices === 0
    ) {
      return 0;
    }

    return Math.min(
      this.currentPage *
        this.pageSize,
      this.totalInvoices
    );

  }


  getVisiblePages(): number[] {

    const pages: number[] = [];

    if (
      this.totalPages <= 0
    ) {
      return pages;
    }

    /*
     * Show up to 5 page buttons.
     *
     * Example:
     *
     * 1 2 3 4 5
     *
     * or:
     *
     * 8 9 10 11 12
     */

    let startPage =
      Math.max(
        1,
        this.currentPage - 2
      );

    let endPage =
      Math.min(
        this.totalPages,
        startPage + 4
      );

    /*
     * If we're near the final page,
     * move the start backwards so that
     * we still show up to 5 pages.
     */
    startPage =
      Math.max(
        1,
        endPage - 4
      );

    for (
      let page = startPage;
      page <= endPage;
      page++
    ) {

      pages.push(
        page
      );

    }

    return pages;

  }


  // ==========================================================
  // Page Size
  // ==========================================================

  changePageSize(
    pageSize: number
  ): void {

    if (
      !Number.isInteger(pageSize) ||
      pageSize <= 0
    ) {
      return;
    }

    this.pageSize =
      pageSize;

    /*
     * Always return to page 1 when the
     * number of rows per page changes.
     */
    this.currentPage =
      1;

    this.loadInvoices(
      1
    );

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

    /*
     * Only DRAFT invoices are editable.
     */
    if (
      invoice.status
        ?.toUpperCase() !==
      'DRAFT'
    ) {

      return;
    }

    this.router.navigate([
      '/invoice',
      invoice.id,
      'edit'
    ]);

  }


  // ==========================================================
  // Can Edit
  // ==========================================================

  canEditInvoice(
    invoice: Invoice
  ): boolean {

    return (
      invoice.status
        ?.toUpperCase() ===
      'DRAFT'
    );

  }


  // ==========================================================
  // Can Delete
  // ==========================================================

  canDeleteInvoice(
    invoice: Invoice
  ): boolean {

    return (
      invoice.status
        ?.toUpperCase() ===
      'DRAFT'
    );

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
     * Only DRAFT invoices may be deleted.
     *
     * The backend enforces the same rule.
     */
    if (
      !this.canDeleteInvoice(
        invoice
      )
    ) {

      alert(
        'Only DRAFT invoices can be deleted.'
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Are you sure you want to delete invoice ${invoice.invoice_number}?`
      );


    if (!confirmed) {
      return;
    }


    this.deletingInvoiceId =
      invoice.id;


    this.invoiceService
      .deleteInvoice(
        invoice.id
      )
      .subscribe({

        next: () => {

          console.log(
            'Invoice deleted:',
            invoice.id
          );

          this.deletingInvoiceId =
            null;

          /*
           * If we deleted the only invoice
           * on the current page, move to the
           * previous page where appropriate.
           */
          if (
            this.invoices.length === 1 &&
            this.currentPage > 1
          ) {

            this.loadInvoices(
              this.currentPage - 1
            );

            return;
          }

          this.loadInvoices(
            this.currentPage
          );

        },


        error: (error) => {

          console.error(
            'Failed to delete invoice:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to delete invoice.';

          this.deletingInvoiceId =
            null;

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


    const parsedDate =
      new Date(date);


    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {
      return '-';
    }


    return parsedDate
      .toLocaleDateString(
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

    const amount =
      Number(
        value ?? 0
      );


    if (
      isNaN(amount)
    ) {
      return 'RM 0.00';
    }


    return amount
      .toLocaleString(
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

      case 'PARTIAL':
        return 'status-partial';

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
import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  Invoice,
  InvoiceService,
  InvoiceSortBy,
  InvoiceSortOrder
} from '../../core/auth/invoice/invoice.service';


@Component({
  selector: 'app-invoice',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './invoice.component.html',

  styleUrl:
    './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {

  // ==========================================================
  // Invoice Data
  // ==========================================================

  invoices: Invoice[] = [];

  loading = false;

  errorMessage = '';

  deletingInvoiceId:
    number | null = null;


  // ==========================================================
  // Pagination
  // ==========================================================

  currentPage = 1;

  pageSize = 20;

  totalInvoices = 0;

  totalPages = 0;


  // ==========================================================
  // Search
  //
  // searchText = what is currently typed.
  // search = what has actually been submitted to backend.
  //
  // This prevents an HTTP request for every keystroke.
  // ==========================================================

  searchText = '';

  search = '';


  // ==========================================================
  // Status Filter
  //
  // Empty string means ALL.
  // ==========================================================

  statusFilter = '';


  // ==========================================================
  // Sorting
  // ==========================================================

  sortBy: InvoiceSortBy =
    'created_at';

  sortOrder: InvoiceSortOrder =
    'desc';


  constructor(
    private invoiceService:
      InvoiceService,

    private router:
      Router
  ) {}


  // ==========================================================
  // Initialise
  // ==========================================================

  ngOnInit(): void {

    this.loadInvoices();

  }


  // ==========================================================
  // Load Invoices
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


    this.loading =
      true;

    this.errorMessage =
      '';


    this.invoiceService
      .getInvoices(
        page,
        this.pageSize,
        this.search,
        this.statusFilter,
        this.sortBy,
        this.sortOrder
      )
      .subscribe({

        next: response => {

          console.log(
            'Invoices loaded:',
            response
          );


          this.invoices =
            response.invoices ??
            [];


          this.currentPage =
            response.pagination.page;


          this.pageSize =
            response.pagination.page_size;


          this.totalInvoices =
            response.pagination.total;


          this.totalPages =
            response.pagination.total_pages;


          this.loading =
            false;

        },


        error: error => {

          console.error(
            'Failed to load invoices:',
            error
          );


          this.errorMessage =
            error?.error?.error ||
            'Failed to load invoices.';


          this.loading =
            false;

        }

      });

  }


  // ==========================================================
  // Search
  // ==========================================================

  applySearch(): void {

    this.search =
      this.searchText
        .trim();


    /*
     * A search may return fewer pages,
     * therefore always return to page 1.
     */
    this.currentPage =
      1;


    this.loadInvoices(
      1
    );

  }


  // ==========================================================
  // Clear Search Only
  // ==========================================================

  clearSearch(): void {

    this.searchText =
      '';

    this.search =
      '';

    this.currentPage =
      1;

    this.loadInvoices(
      1
    );

  }


  // ==========================================================
  // Status Filter
  // ==========================================================

  applyStatusFilter(): void {

    this.currentPage =
      1;

    this.loadInvoices(
      1
    );

  }


  // ==========================================================
  // Clear All Filters
  // ==========================================================

  clearFilters(): void {

    this.searchText =
      '';

    this.search =
      '';

    this.statusFilter =
      '';

    this.sortBy =
      'created_at';

    this.sortOrder =
      'desc';

    this.currentPage =
      1;

    this.loadInvoices(
      1
    );

  }


  // ==========================================================
  // Check If Any Filter Is Active
  // ==========================================================

  hasActiveFilters(): boolean {

    return (
      this.search !== '' ||
      this.statusFilter !== ''
    );

  }


  // ==========================================================
  // Sort
  // ==========================================================

  sortInvoices(
    column: InvoiceSortBy
  ): void {

    /*
     * Clicking the currently selected
     * column toggles ASC / DESC.
     */
    if (
      this.sortBy === column
    ) {

      this.sortOrder =
        this.sortOrder === 'asc'
          ? 'desc'
          : 'asc';

    } else {

      /*
       * A new column defaults to ASC,
       * except dates/total where DESC
       * tends to be more useful.
       */

      this.sortBy =
        column;


      if (
        column === 'invoice_date' ||
        column === 'due_date' ||
        column === 'total' ||
        column === 'created_at'
      ) {

        this.sortOrder =
          'desc';

      } else {

        this.sortOrder =
          'asc';

      }

    }


    this.currentPage =
      1;


    this.loadInvoices(
      1
    );

  }


  // ==========================================================
  // Sort Indicator
  // ==========================================================

  getSortIndicator(
    column: InvoiceSortBy
  ): string {

    if (
      this.sortBy !== column
    ) {
      return '';
    }


    return this.sortOrder === 'asc'
      ? '▲'
      : '▼';

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
      this.currentPage >=
        this.totalPages ||
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

    const pages:
      number[] = [];


    if (
      this.totalPages <= 0
    ) {
      return pages;
    }


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
      !Number.isInteger(
        pageSize
      ) ||
      pageSize <= 0
    ) {
      return;
    }


    this.pageSize =
      pageSize;


    this.currentPage =
      1;


    this.loadInvoices(
      1
    );

  }


  // ==========================================================
  // Create Invoice
  // ==========================================================

  createInvoice(): void {

    this.router.navigate([
      '/invoice/new'
    ]);

  }


  // ==========================================================
  // View Invoice
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
  // Edit Invoice
  // ==========================================================

  editInvoice(
    invoice: Invoice
  ): void {

    if (!invoice.id) {
      return;
    }


    if (
      !this.canEditInvoice(
        invoice
      )
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
  // Can Edit Invoice
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
  // Can Delete Invoice
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
  // Delete Invoice
  // ==========================================================

  deleteInvoice(
    invoice: Invoice
  ): void {

    if (!invoice.id) {
      return;
    }


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
           * If this was the only record on
           * the current page, go backwards.
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


        error: error => {

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
  // Format Date
  // ==========================================================

  formatDate(
    date?: string | null
  ): string {

    if (!date) {
      return '-';
    }


    const parsedDate =
      new Date(
        date
      );


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
  // Format Money
  // ==========================================================

  formatMoney(
    value?:
      string |
      number |
      null
  ): string {

    const amount =
      Number(
        value ??
        0
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
  // Status CSS
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
  // Track Invoice
  // ==========================================================

  trackByInvoiceId(
    index: number,
    invoice: Invoice
  ): number {

    return (
      invoice.id ??
      index
    );

  }

}
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
  Payment,
  PaymentService,
  PaymentSortBy,
  PaymentSortOrder
} from '../../core/auth/payment/payment.service';


@Component({
  selector: 'app-payment',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './payment.component.html',

  styleUrl:
    './payment.component.scss'
})
export class PaymentComponent
  implements OnInit {

  // ==========================================================
  // Data
  // ==========================================================

  payments: Payment[] = [];

  loading = false;

  errorMessage = '';


  // ==========================================================
  // Pagination
  // ==========================================================

  currentPage = 1;

  pageSize = 20;

  totalPayments = 0;

  totalPages = 0;


  // ==========================================================
  // Search
  // ==========================================================

  searchText = '';

  search = '';


  // ==========================================================
  // Payment Method Filter
  // ==========================================================

  paymentMethodFilter = '';


  // ==========================================================
  // Sorting
  // ==========================================================

  sortBy: PaymentSortBy =
    'payment_date';

  sortOrder: PaymentSortOrder =
    'desc';


  constructor(
    private paymentService:
      PaymentService,

    private router:
      Router
  ) {}


  // ==========================================================
  // Initialise
  // ==========================================================

  ngOnInit(): void {

    this.loadPayments();

  }


  // ==========================================================
  // Load Payments
  // ==========================================================

  loadPayments(
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


    this.paymentService
      .getPayments(
        page,
        this.pageSize,
        this.search,
        this.paymentMethodFilter,
        this.sortBy,
        this.sortOrder
      )
      .subscribe({

        next: response => {

          console.log(
            'Payments loaded:',
            response
          );


          this.payments =
            response.payments ?? [];


          this.currentPage =
            response.pagination.page;


          this.pageSize =
            response.pagination.page_size;


          this.totalPayments =
            response.pagination.total;


          this.totalPages =
            response.pagination.total_pages;


          this.loading =
            false;

        },


        error: error => {

          console.error(
            'Failed to load payments:',
            error
          );


          this.errorMessage =
            error?.error?.error ||
            'Failed to load payments.';


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


    this.currentPage =
      1;


    this.loadPayments(
      1
    );

  }


  clearSearch(): void {

    this.searchText =
      '';

    this.search =
      '';

    this.currentPage =
      1;

    this.loadPayments(
      1
    );

  }


  // ==========================================================
  // Payment Method Filter
  // ==========================================================

  applyPaymentMethodFilter(): void {

    this.currentPage =
      1;

    this.loadPayments(
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

    this.paymentMethodFilter =
      '';

    this.sortBy =
      'payment_date';

    this.sortOrder =
      'desc';

    this.currentPage =
      1;

    this.loadPayments(
      1
    );

  }


  hasActiveFilters(): boolean {

    return (
      this.search !== '' ||
      this.paymentMethodFilter !== ''
    );

  }


  // ==========================================================
  // Sorting
  // ==========================================================

  sortPayments(
    column: PaymentSortBy
  ): void {

    if (
      this.sortBy === column
    ) {

      this.sortOrder =
        this.sortOrder === 'asc'
          ? 'desc'
          : 'asc';

    } else {

      this.sortBy =
        column;


      if (
        column === 'payment_date' ||
        column === 'amount' ||
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


    this.loadPayments(
      1
    );

  }


  getSortIndicator(
    column: PaymentSortBy
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
  // Pagination
  // ==========================================================

  previousPage(): void {

    if (
      this.currentPage <= 1 ||
      this.loading
    ) {
      return;
    }


    this.loadPayments(
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


    this.loadPayments(
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


    this.loadPayments(
      page
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


  getFirstRecordNumber(): number {

    if (
      this.totalPayments === 0
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
      this.totalPayments === 0
    ) {
      return 0;
    }


    return Math.min(
      this.currentPage *
        this.pageSize,
      this.totalPayments
    );

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


    this.loadPayments(
      1
    );

  }


  // ==========================================================
  // Navigation
  // ==========================================================

  viewInvoice(
    payment: Payment
  ): void {

    if (
      !payment.invoice_id
    ) {
      return;
    }


    this.router.navigate([
      '/invoice',
      payment.invoice_id
    ]);

  }


  // ==========================================================
  // Formatting
  // ==========================================================

  formatMoney(
    value?:
      string |
      number |
      null
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


  formatDate(
    value?:
      string |
      null
  ): string {

    if (!value) {
      return '-';
    }


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
      isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }


    return date
      .toLocaleDateString(
        'en-MY',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }
      );

  }


  formatPaymentMethod(
    method?:
      string |
      null
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
        character =>
          character.toUpperCase()
      );

  }


  // ==========================================================
  // Track
  // ==========================================================

  trackByPaymentId(
    index: number,
    payment: Payment
  ): number {

    return (
      payment.id ??
      index
    );

  }

}
import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  StockTransaction,
  StockTransactionService,
  StockTransactionSortBy,
  StockTransactionSortOrder
} from '../../core/auth/stock-transaction/stock-transaction.service';

import {
  Product,
  ProductService
} from '../../core/auth/product/product.service';


@Component({
  selector: 'app-stock-transaction',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],

  templateUrl:
    './stock-transaction.component.html',

  styleUrl:
    './stock-transaction.component.scss'
})
export class StockTransactionComponent
  implements OnInit {

  // ==========================================================
  // Form
  // ==========================================================

  transactionForm!: FormGroup;

  products: Product[] = [];

  loadingProducts =
    false;

  submitting =
    false;


  // ==========================================================
  // Messages
  // ==========================================================

  errorMessage =
    '';

  successMessage =
    '';


  // ==========================================================
  // Transaction List
  // ==========================================================

  transactions:
    StockTransaction[] = [];

  loadingTransactions =
    false;


  // ==========================================================
  // Pagination
  // ==========================================================

  currentPage =
    1;

  pageSize =
    20;

  totalTransactions =
    0;

  totalPages =
    0;


  // ==========================================================
  // Search
  // ==========================================================

  searchText =
    '';

  search =
    '';


  // ==========================================================
  // Filter
  // ==========================================================

  transactionTypeFilter =
    '';


  // ==========================================================
  // Sorting
  // ==========================================================

  sortBy:
    StockTransactionSortBy =
      'created_at';

  sortOrder:
    StockTransactionSortOrder =
      'desc';


  constructor(
    @Inject(PLATFORM_ID)
    private platformId: Object,

    private fb:
      FormBuilder,

    private stockTransactionService:
      StockTransactionService,

    private productService:
      ProductService
  ) {}


  // ==========================================================
  // Initialise
  // ==========================================================

  ngOnInit(): void {

    /*
    * Build the form during both SSR and browser rendering.
    *
    * The HTML requires transactionForm to exist.
    */
    this.transactionForm =
      this.fb.group({

        product_id: [
          null,
          Validators.required
        ],

        transaction_type: [
          'STOCK_IN',
          Validators.required
        ],

        quantity: [
          null,
          [
            Validators.required,
            Validators.min(1)
          ]
        ],

        notes: [
          '',
          Validators.maxLength(
            1000
          )
        ]

      });


    /*
    * Do not make authenticated HTTP requests
    * from Angular's SSR environment.
    */
    if (
      !isPlatformBrowser(
        this.platformId
      )
    ) {

      console.log(
        'StockTransactionComponent: skipping API calls during SSR'
      );

      return;

    }


    /*
    * Browser only.
    */
    this.loadProducts();

    this.loadTransactions();

  }


  // ==========================================================
  // Load Products
  // ==========================================================

  loadProducts(): void {

    this.loadingProducts =
      true;

    this.errorMessage =
      '';


    this.productService
      .getProducts()
      .subscribe({

        next: response => {

          console.log(
            'Products loaded:',
            response
          );


          this.products =
            response.products ??
            [];


          this.loadingProducts =
            false;

        },


        error: error => {

          console.error(
            'Failed to load products:',
            error
          );


          this.errorMessage =
            error?.error?.error ||
            'Failed to load products.';


          this.loadingProducts =
            false;

        }

      });

  }


  // ==========================================================
  // Load Transaction History
  // ==========================================================

  loadTransactions(
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


    this.loadingTransactions =
      true;


    this.stockTransactionService
      .getStockTransactions(
        page,
        this.pageSize,
        this.search,
        this.transactionTypeFilter,
        this.sortBy,
        this.sortOrder
      )
      .subscribe({

        next: response => {

          console.log(
            'Stock transactions loaded:',
            response
          );


          this.transactions =
            response.transactions ??
            [];


          this.currentPage =
            response.pagination.page;


          this.pageSize =
            response.pagination.page_size;


          this.totalTransactions =
            response.pagination.total;


          this.totalPages =
            response.pagination.total_pages;


          this.loadingTransactions =
            false;

        },


        error: error => {

          console.error(
            'Failed to load stock transactions:',
            error
          );


          this.errorMessage =
            error?.error?.error ||
            'Failed to load stock transactions.';


          this.loadingTransactions =
            false;

        }

      });

  }


  // ==========================================================
  // Transaction Type Change
  // ==========================================================

  onTransactionTypeChange(): void {

    const transactionType =
      this.transactionForm
        .get(
          'transaction_type'
        )
        ?.value;


    const quantityControl =
      this.transactionForm
        .get(
          'quantity'
        );


    if (!quantityControl) {
      return;
    }


    quantityControl
      .clearValidators();


    if (
      transactionType ===
      'ADJUSTMENT'
    ) {

      quantityControl
        .setValidators([
          Validators.required,
          this.nonZeroValidator
        ]);

    } else {

      quantityControl
        .setValidators([
          Validators.required,
          Validators.min(1)
        ]);

    }


    quantityControl
      .updateValueAndValidity();

  }


  // ==========================================================
  // Non-Zero Validator
  // ==========================================================

  nonZeroValidator(
    control: AbstractControl
  ): ValidationErrors | null {

    if (
      control.value === null ||
      control.value === ''
    ) {

      return null;

    }


    const value =
      Number(
        control.value
      );


    if (
      isNaN(value)
    ) {

      return {
        invalidNumber: true
      };

    }


    if (
      value === 0
    ) {

      return {
        zero: true
      };

    }


    return null;

  }


  // ==========================================================
  // Create Transaction
  // ==========================================================

  createTransaction(): void {

    if (
      this.transactionForm.invalid
    ) {

      this.transactionForm
        .markAllAsTouched();

      return;

    }


    this.submitting =
      true;

    this.errorMessage =
      '';

    this.successMessage =
      '';


    const transaction:
      StockTransaction = {

        product_id:
          Number(
            this.transactionForm
              .value
              .product_id
          ),

        transaction_type:
          this.transactionForm
            .value
            .transaction_type,

        quantity:
          Number(
            this.transactionForm
              .value
              .quantity
          ),

        notes:
          this.transactionForm
            .value
            .notes
            ?.trim() ||
          undefined

      };


    console.log(
      'Creating stock transaction:',
      transaction
    );


    this.stockTransactionService
      .createStockTransaction(
        transaction
      )
      .subscribe({

        next: response => {

          console.log(
            'Stock transaction created:',
            response
          );


          this.successMessage =
            response?.message ||
            'Stock transaction created successfully.';


          this.submitting =
            false;


          this.transactionForm
            .reset({

              product_id:
                null,

              transaction_type:
                'STOCK_IN',

              quantity:
                null,

              notes:
                ''

            });


          this.onTransactionTypeChange();


          /*
           * Refresh products because their
           * stock quantity has changed.
           */
          this.loadProducts();


          /*
           * Refresh transaction history.
           *
           * Newest transaction should appear
           * on page 1.
           */
          this.currentPage =
            1;

          this.loadTransactions(
            1
          );

        },


        error: error => {

          console.error(
            'Failed to create stock transaction:',
            error
          );


          this.errorMessage =
            error?.error?.error ||
            'Failed to create stock transaction.';


          this.submitting =
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


    this.loadTransactions(
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

    this.loadTransactions(
      1
    );

  }


  // ==========================================================
  // Filter
  // ==========================================================

  applyTransactionTypeFilter(): void {

    this.currentPage =
      1;

    this.loadTransactions(
      1
    );

  }


  // ==========================================================
  // Clear Filters
  // ==========================================================

  clearFilters(): void {

    this.searchText =
      '';

    this.search =
      '';

    this.transactionTypeFilter =
      '';

    this.sortBy =
      'created_at';

    this.sortOrder =
      'desc';

    this.currentPage =
      1;

    this.loadTransactions(
      1
    );

  }


  hasActiveFilters(): boolean {

    return (
      this.search !== '' ||
      this.transactionTypeFilter !== ''
    );

  }


  // ==========================================================
  // Sorting
  // ==========================================================

  sortTransactions(
    column:
      StockTransactionSortBy
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
        column === 'created_at' ||
        column === 'quantity'
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

    this.loadTransactions(
      1
    );

  }


  getSortIndicator(
    column:
      StockTransactionSortBy
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
      this.loadingTransactions
    ) {
      return;
    }


    this.loadTransactions(
      this.currentPage - 1
    );

  }


  nextPage(): void {

    if (
      this.currentPage >=
        this.totalPages ||
      this.loadingTransactions
    ) {
      return;
    }


    this.loadTransactions(
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
      this.loadingTransactions
    ) {
      return;
    }


    this.loadTransactions(
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
      this.totalTransactions === 0
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
      this.totalTransactions === 0
    ) {

      return 0;

    }


    return Math.min(
      this.currentPage *
        this.pageSize,
      this.totalTransactions
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

    this.loadTransactions(
      1
    );

  }


  // ==========================================================
  // Display Helpers
  // ==========================================================

  formatDate(
    value?:
      string |
      null
  ): string {

    if (!value) {

      return '-';

    }


    const date =
      new Date(
        value
      );


    if (
      isNaN(
        date.getTime()
      )
    ) {

      return '-';

    }


    return date
      .toLocaleString(
        'en-MY',
        {
          year:
            'numeric',

          month:
            'short',

          day:
            'numeric',

          hour:
            '2-digit',

          minute:
            '2-digit'
        }
      );

  }


  formatTransactionType(
    transactionType?:
      string |
      null
  ): string {

    if (!transactionType) {

      return '-';

    }


    switch (
      transactionType
        .toUpperCase()
    ) {

      case 'STOCK_IN':

        return 'Stock In';


      case 'STOCK_OUT':

        return 'Stock Out';


      case 'ADJUSTMENT':

        return 'Adjustment';


      default:

        return transactionType;

    }

  }


  getTransactionTypeClass(
    transactionType?:
      string |
      null
  ): string {

    switch (
      transactionType
        ?.toUpperCase()
    ) {

      case 'STOCK_IN':

        return (
          'bg-green-100 text-green-700'
        );


      case 'STOCK_OUT':

        return (
          'bg-red-100 text-red-700'
        );


      case 'ADJUSTMENT':

        return (
          'bg-orange-100 text-orange-700'
        );


      default:

        return (
          'bg-gray-100 text-gray-700'
        );

    }

  }


  formatReference(
    transaction:
      StockTransaction
  ): string {

    if (
      !transaction.reference_type
    ) {

      return '-';

    }


    if (
      transaction.reference_id
    ) {

      return (
        transaction.reference_type +
        ' #' +
        transaction.reference_id
      );

    }


    return transaction
      .reference_type;

  }


  // ==========================================================
  // Form Helpers
  // ==========================================================

  get quantityControl():
    AbstractControl | null {

    return this.transactionForm
      .get(
        'quantity'
      );

  }


  get transactionType():
    string {

    return this.transactionForm
      .get(
        'transaction_type'
      )
      ?.value;

  }


  // ==========================================================
  // Track
  // ==========================================================

  trackByTransactionId(
    index: number,
    transaction:
      StockTransaction
  ): number {

    return (
      transaction.id ??
      index
    );

  }

}
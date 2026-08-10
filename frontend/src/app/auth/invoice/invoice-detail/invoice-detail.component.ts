import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Invoice,
  InvoiceItem,
  InvoiceResponse,
  InvoiceService
} from '../../../core/auth/invoice/invoice.service';

import {
  CreatePaymentRequest,
  InvoicePaymentSummary,
  Payment,
  PaymentMethod,
  PaymentService
} from '../../../core/auth/payment/payment.service';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './invoice-detail.component.html',

  styleUrl:
    './invoice-detail.component.scss'
})
export class InvoiceDetailComponent
  implements OnInit {

  invoice: Invoice | null = null;

  paymentSummary:
    InvoicePaymentSummary | null = null;

  paymentForm!: FormGroup;

  invoiceId = 0;

  loading = false;

  loadingPayments = false;

  submittingPayment = false;

  cancellingInvoice = false;

  errorMessage = '';

  paymentErrorMessage = '';

  paymentSuccessMessage = '';

  actionSuccessMessage = '';

  paymentMethods: {
    value: PaymentMethod;
    label: string;
  }[] = [

    {
      value: 'CASH',
      label: 'Cash'
    },

    {
      value: 'BANK_TRANSFER',
      label: 'Bank Transfer'
    },

    {
      value: 'CARD',
      label: 'Card'
    },

    {
      value: 'E_WALLET',
      label: 'E-Wallet'
    },

    {
      value: 'OTHER',
      label: 'Other'
    }

  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {

    this.paymentForm =
      this.fb.group({

        amount: [
          null,
          [
            Validators.required,
            Validators.min(0.01)
          ]
        ],

        payment_method: [
          'BANK_TRANSFER',
          Validators.required
        ],

        payment_date: [
          this.getTodayDate(),
          Validators.required
        ],

        reference_no: [
          ''
        ],

        notes: [
          ''
        ]

      });

    const id =
      Number(
        this.route.snapshot
          .paramMap
          .get('id')
      );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      this.errorMessage =
        'Invalid invoice ID.';

      return;
    }

    this.invoiceId =
      id;

    this.loadInvoice();

  }

  // ==========================================================
  // Load Invoice
  // ==========================================================

  loadInvoice(): void {

    this.loading = true;

    this.errorMessage = '';

    this.invoiceService
      .getInvoice(
        this.invoiceId
      )
      .subscribe({

        next: response => {

          this.invoice =
            this.extractInvoice(
              response
            );

          this.loading =
            false;

          this.loadPaymentSummary();

        },

        error: error => {

          console.error(
            'Failed to load invoice:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to load invoice.';

          this.loading =
            false;

        }

      });

  }

  // ==========================================================
  // Extract Invoice
  // ==========================================================

  private extractInvoice(
    response:
      Invoice |
      InvoiceResponse
  ): Invoice {

    if (
      response !== null &&
      typeof response === 'object' &&
      'invoice' in response
    ) {

      return response.invoice;

    }

    return response;

  }

  // ==========================================================
  // Payment Summary
  // ==========================================================

  loadPaymentSummary(): void {

    if (!this.invoiceId) {
      return;
    }

    this.loadingPayments =
      true;

    this.paymentErrorMessage =
      '';

    this.paymentService
      .getInvoicePaymentSummary(
        this.invoiceId
      )
      .subscribe({

        next: response => {

          this.paymentSummary =
            response.payment_summary;

          this.loadingPayments =
            false;

        },

        error: error => {

          console.error(
            'Failed to load payments:',
            error
          );

          this.paymentErrorMessage =
            error?.error?.error ||
            'Failed to load payment information.';

          this.loadingPayments =
            false;

        }

      });

  }

  // ==========================================================
  // Create Payment
  // ==========================================================

  createPayment(): void {

    this.paymentErrorMessage =
      '';

    this.paymentSuccessMessage =
      '';

    if (!this.invoice) {

      this.paymentErrorMessage =
        'Invoice information is unavailable.';

      return;
    }

    if (!this.canAddPayment()) {

      this.paymentErrorMessage =
        'Payments cannot be added to this invoice.';

      return;
    }

    if (this.paymentForm.invalid) {

      this.paymentForm
        .markAllAsTouched();

      this.paymentErrorMessage =
        'Please complete all required payment fields.';

      return;
    }

    const paymentAmount =
      Number(
        this.paymentForm
          .value
          .amount
      );

    const outstanding =
      this.getOutstandingBalance();

    if (
      !Number.isFinite(
        paymentAmount
      ) ||
      paymentAmount <= 0
    ) {

      this.paymentErrorMessage =
        'Payment amount must be greater than zero.';

      return;
    }

    if (
      paymentAmount >
      outstanding
    ) {

      this.paymentErrorMessage =
        `Payment cannot exceed the outstanding balance of RM ${outstanding.toFixed(2)}.`;

      return;
    }

    const paymentMethod = (
  this.paymentForm.value.payment_method
) as PaymentMethod;

    const referenceNo =
      this.paymentForm
        .value
        .reference_no
        ?.trim() ||
      null;

    const notes =
      this.paymentForm
        .value
        .notes
        ?.trim() ||
      null;

    const payload:
      CreatePaymentRequest = {

      invoice_id:
        this.invoiceId,

      amount:
        paymentAmount
          .toFixed(2),

      payment_method:
        paymentMethod,

      payment_date:
        this.toISOString(
          this.paymentForm
            .value
            .payment_date
        ),

      reference_no:
        referenceNo,

      notes:
        notes

    };

    this.submittingPayment =
      true;

    this.paymentService
      .createPayment(
        payload
      )
      .subscribe({

        next: response => {

          this.submittingPayment =
            false;

          this.paymentSuccessMessage =
            response.message ||
            'Payment created successfully.';

          this.resetPaymentForm();

          this.refreshInvoiceAndPayments();

        },

        error: error => {

          console.error(
            'Failed to create payment:',
            error
          );

          this.submittingPayment =
            false;

          this.paymentErrorMessage =
            error?.error?.error ||
            'Failed to create payment.';

        }

      });

  }

  // ==========================================================
  // Cancel Invoice
  // ==========================================================

  cancelInvoice(): void {

    if (!this.invoice?.id) {
      return;
    }

    if (!this.canCancelInvoice()) {

      this.errorMessage =
        'This invoice cannot be cancelled.';

      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to cancel this invoice?'
      );

    if (!confirmed) {
      return;
    }

    this.errorMessage =
      '';

    this.actionSuccessMessage =
      '';

    this.cancellingInvoice =
      true;

    /*
     * For an ISSUED invoice the backend only needs
     * the status because it restores the ORIGINAL
     * invoice item quantities.
     *
     * For DRAFT we submit the existing values so the
     * current UpdateInvoice endpoint can process it
     * normally.
     */

    if (
      this.invoice.status
        ?.toUpperCase() ===
      'ISSUED'
    ) {

      const payload = {
        status: 'CANCELLED'
      };

      this.invoiceService
        .updateInvoice(
          this.invoiceId,
          payload
        )
        .subscribe({

          next: () => {

            this.cancellingInvoice =
              false;

            this.actionSuccessMessage =
              'Invoice cancelled successfully.';

            this.refreshInvoiceAndPayments();

          },

          error: error => {

            console.error(
              'Failed to cancel invoice:',
              error
            );

            this.cancellingInvoice =
              false;

            this.errorMessage =
              error?.error?.error ||
              'Failed to cancel invoice.';

          }

        });

      return;
    }

    /*
     * DRAFT cancellation.
     */
    const payload = {

      customer_id:
        this.invoice.customer_id,

      invoice_date:
        this.invoice.invoice_date,

      due_date:
        this.invoice.due_date ??
        null,

      status:
        'CANCELLED',

      discount:
        Number(
          this.invoice.discount ??
          0
        ).toFixed(2),

      tax:
        Number(
          this.invoice.tax ??
          0
        ).toFixed(2),

      notes:
        this.invoice.notes ??
        null,

      items:
        (
          this.invoice.items ??
          []
        ).map(item => ({

          product_id:
            item.product_id,

          quantity:
            Number(
              item.quantity
            ),

          unit_price:
            Number(
              item.unit_price ??
              0
            ).toFixed(2),

          discount:
            Number(
              item.discount ??
              0
            ).toFixed(2)

        }))

    };

    this.invoiceService
      .updateInvoice(
        this.invoiceId,
        payload
      )
      .subscribe({

        next: () => {

          this.cancellingInvoice =
            false;

          this.actionSuccessMessage =
            'Invoice cancelled successfully.';

          this.refreshInvoiceAndPayments();

        },

        error: error => {

          console.error(
            'Failed to cancel invoice:',
            error
          );

          this.cancellingInvoice =
            false;

          this.errorMessage =
            error?.error?.error ||
            'Failed to cancel invoice.';

        }

      });

  }

  // ==========================================================
  // Refresh
  // ==========================================================

  refreshInvoiceAndPayments(): void {

    this.invoiceService
      .getInvoice(
        this.invoiceId
      )
      .subscribe({

        next: response => {

          this.invoice =
            this.extractInvoice(
              response
            );

          this.loadPaymentSummary();

        },

        error: error => {

          console.error(
            'Failed to refresh invoice:',
            error
          );

          this.loadPaymentSummary();

        }

      });

  }

  // ==========================================================
  // Reset Payment Form
  // ==========================================================

  resetPaymentForm(): void {

    this.paymentForm.reset({

      amount:
        null,

      payment_method:
        'BANK_TRANSFER',

      payment_date:
        this.getTodayDate(),

      reference_no:
        '',

      notes:
        ''

    });

  }

  // ==========================================================
  // Business Rules
  // ==========================================================

  canEditInvoice(): boolean {

    if (!this.invoice) {
      return false;
    }

    return (
      this.invoice.status
        ?.toUpperCase() ===
      'DRAFT'
    );

  }

  canCancelInvoice(): boolean {

    if (!this.invoice) {
      return false;
    }

    const status =
      this.invoice.status
        ?.toUpperCase();

    return (
      status === 'DRAFT' ||
      status === 'ISSUED'
    );

  }

  canAddPayment(): boolean {

    if (!this.invoice) {
      return false;
    }

    const status =
      this.invoice.status
        ?.toUpperCase();

    return (
      status === 'ISSUED' ||
      status === 'PARTIAL'
    );

  }

  // ==========================================================
  // Payment Helpers
  // ==========================================================

  getPayments(): Payment[] {

    return (
      this.paymentSummary
        ?.payments ??
      []
    );

  }

  getOutstandingBalance(): number {

    return Number(
      this.paymentSummary
        ?.outstanding_balance ??
      this.invoice
        ?.total ??
      0
    ) || 0;

  }

  getAmountPaid(): number {

    return Number(
      this.paymentSummary
        ?.amount_paid ??
      0
    ) || 0;

  }

  getInvoiceTotal(): number {

    return Number(
      this.paymentSummary
        ?.invoice_total ??
      this.invoice
        ?.total ??
      0
    ) || 0;

  }

  // ==========================================================
  // Invoice Item Helpers
  // ==========================================================

  getItemTotal(
    item: InvoiceItem
  ): number {

    if (
      item.total !== undefined &&
      item.total !== null
    ) {

      return Number(
        item.total
      ) || 0;

    }

    const quantity =
      Number(
        item.quantity
      ) || 0;

    const unitPrice =
      Number(
        item.unit_price
      ) || 0;

    const discount =
      Number(
        item.discount
      ) || 0;

    return (
      quantity *
      unitPrice
    ) - discount;

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

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }

    return date
      .toLocaleDateString(
        'en-MY',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }
      );

  }

  getStatusClass(
    status:
      string |
      null |
      undefined
  ): string {

    switch (
      status?.toUpperCase()
    ) {

      case 'DRAFT':
        return 'bg-gray-100 text-gray-700';

      case 'ISSUED':
        return 'bg-blue-100 text-blue-700';

      case 'PARTIAL':
        return 'bg-orange-100 text-orange-700';

      case 'PAID':
        return 'bg-green-100 text-green-700';

      case 'CANCELLED':
        return 'bg-red-100 text-red-700';

      default:
        return 'bg-gray-100 text-gray-700';

    }

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
  // Payment Utility
  // ==========================================================

  useOutstandingBalance(): void {

    this.paymentForm.patchValue({

      amount:
        this
          .getOutstandingBalance()
          .toFixed(2)

    });

  }

  getTodayDate(): string {

    return new Date()
      .toISOString()
      .split('T')[0];

  }

  toISOString(
    date: string
  ): string {

    if (
      date.includes('T')
    ) {
      return date;
    }

    return `${date}T00:00:00Z`;

  }

  // ==========================================================
  // Navigation
  // ==========================================================

  editInvoice(): void {

    if (
      !this.invoice?.id ||
      !this.canEditInvoice()
    ) {
      return;
    }

    this.router.navigate([
      '/invoice',
      this.invoice.id,
      'edit'
    ]);

  }

  backToInvoices(): void {

    this.router.navigate([
      '/invoice'
    ]);

  }

  printInvoice(): void {

    window.print();

  }

}
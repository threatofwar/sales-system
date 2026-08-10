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

  errorMessage = '';

  paymentErrorMessage = '';

  paymentSuccessMessage = '';


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

    this.paymentForm = this.fb.group({

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


    this.route.paramMap.subscribe(
      params => {

        const id = Number(
          params.get('id')
        );


        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {

          this.errorMessage =
            'Invalid invoice ID.';

          return;

        }


        this.invoiceId = id;

        this.loadInvoice();

      }
    );

  }


  /*
   * Load the invoice and then load its payments.
   */
  loadInvoice(): void {

    this.loading = true;

    this.errorMessage = '';

    this.invoiceService
      .getInvoice(this.invoiceId)
      .subscribe({

        next: response => {

          this.invoice =
            this.extractInvoice(response);

          this.loading = false;

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

          this.loading = false;

        }

      });

  }


  /*
   * Support either:
   *
   * {
   *   "invoice": { ... }
   * }
   *
   * or a direct invoice object.
   */
  private extractInvoice(
    response: Invoice | InvoiceResponse
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


  /*
   * Load payments and outstanding balance.
   */
  loadPaymentSummary(): void {

    if (!this.invoiceId) {
      return;
    }

    this.loadingPayments = true;

    this.paymentErrorMessage = '';

    this.paymentService
      .getInvoicePaymentSummary(
        this.invoiceId
      )
      .subscribe({

        next: response => {

          this.paymentSummary =
            response.payment_summary;

          this.loadingPayments = false;

        },

        error: error => {

          console.error(
            'Failed to load payments:',
            error
          );

          this.paymentErrorMessage =
            error?.error?.error ||
            'Failed to load payment information.';

          this.loadingPayments = false;

        }

      });

  }


  /*
   * Create a payment.
   */
  createPayment(): void {

    this.paymentErrorMessage = '';

    this.paymentSuccessMessage = '';


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

      this.paymentForm.markAllAsTouched();

      this.paymentErrorMessage =
        'Please complete all required payment fields.';

      return;

    }


    const paymentAmount = Number(
      this.paymentForm.value.amount
    );

    const outstanding =
      this.getOutstandingBalance();


    if (
      !Number.isFinite(paymentAmount) ||
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


    const paymentMethod =
      this.paymentForm.value
        .payment_method as PaymentMethod;


    const referenceNo =
      this.paymentForm.value
        .reference_no
        ?.trim() || null;


    const notes =
      this.paymentForm.value
        .notes
        ?.trim() || null;


    const payload: CreatePaymentRequest = {

      invoice_id:
        this.invoiceId,

      amount:
        paymentAmount.toFixed(2),

      payment_method:
        paymentMethod,

      payment_date:
        this.toISOString(
          this.paymentForm.value
            .payment_date
        ),

      reference_no:
        referenceNo,

      notes:
        notes

    };


    console.log(
      'Creating payment:',
      payload
    );


    this.submittingPayment = true;


    this.paymentService
      .createPayment(payload)
      .subscribe({

        next: response => {

          console.log(
            'Payment created:',
            response
          );

          this.submittingPayment = false;

          this.paymentSuccessMessage =
            response.message ||
            'Payment created successfully.';


          this.resetPaymentForm();


          /*
           * Reload both because the invoice
           * status may now be PARTIAL or PAID.
           */
          this.refreshInvoiceAndPayments();

        },

        error: error => {

          console.error(
            'Failed to create payment:',
            error
          );

          this.paymentErrorMessage =
            error?.error?.error ||
            'Failed to create payment.';

          this.submittingPayment = false;

        }

      });

  }


  /*
   * Refresh invoice status and payment totals.
   */
  refreshInvoiceAndPayments(): void {

    this.invoiceService
      .getInvoice(this.invoiceId)
      .subscribe({

        next: response => {

          this.invoice =
            this.extractInvoice(response);

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


  /*
   * Reset payment form while keeping today's date.
   */
  resetPaymentForm(): void {

    this.paymentForm.reset({

      amount: null,

      payment_method:
        'BANK_TRANSFER',

      payment_date:
        this.getTodayDate(),

      reference_no: '',

      notes: ''

    });

  }


  /*
   * Whether the current invoice may accept payments.
   */
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


  /*
   * Whether editing is allowed.
   */
  canEditInvoice(): boolean {

    if (!this.invoice) {
      return false;
    }

    const status =
      this.invoice.status
        ?.toUpperCase();

    return (
      status !== 'PAID' &&
      status !== 'CANCELLED'
    );

  }


  /*
   * Return payment history safely.
   */
  getPayments(): Payment[] {

    return (
      this.paymentSummary?.payments ??
      []
    );

  }


  /*
   * Outstanding balance.
   */
  getOutstandingBalance(): number {

    return Number(
      this.paymentSummary
        ?.outstanding_balance ??
      this.invoice?.total ??
      0
    ) || 0;

  }


  /*
   * Amount already paid.
   */
  getAmountPaid(): number {

    return Number(
      this.paymentSummary
        ?.amount_paid ??
      0
    ) || 0;

  }


  /*
   * Invoice total.
   */
  getInvoiceTotal(): number {

    return Number(
      this.paymentSummary
        ?.invoice_total ??
      this.invoice?.total ??
      0
    ) || 0;

  }


  /*
   * Item total.
   */
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
      Number(item.quantity) || 0;

    const unitPrice =
      Number(item.unit_price) || 0;

    const discount =
      Number(item.discount) || 0;


    return (
      quantity * unitPrice
    ) - discount;

  }


  /*
   * Currency formatting.
   */
  formatMoney(
    value:
      string |
      number |
      null |
      undefined
  ): string {

    const amount =
      Number(value ?? 0);


    if (!Number.isFinite(amount)) {

      return '0.00';

    }


    return amount.toFixed(2);

  }


  /*
   * Date formatting.
   */
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
      new Date(value);


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


  /*
   * Status badge classes.
   */
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


  /*
   * Human-readable payment method.
   */
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
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(
        /\b\w/g,
        letter =>
          letter.toUpperCase()
      );

  }


  /*
   * Set the full outstanding amount
   * into the payment form.
   */
  useOutstandingBalance(): void {

    this.paymentForm.patchValue({

      amount:
        this.getOutstandingBalance()
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

    return `${date}T00:00:00Z`;

  }


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


  backToInvoices(): void {

    this.router.navigate([
      '/invoice'
    ]);

  }


  printInvoice(): void {

    window.print();

  }

}
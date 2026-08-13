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

  generatingPdf = false;

  sharingInvoice = false;

  errorMessage = '';

  paymentErrorMessage = '';

  paymentSuccessMessage = '';

  actionSuccessMessage = '';

  shareMessage = '';


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

    this.loading =
      true;

    this.errorMessage =
      '';


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


    const paymentMethod =
      this.paymentForm
        .value
        .payment_method as PaymentMethod;


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
  // PDF Generator
  // ==========================================================

  private async buildInvoicePdf(): Promise<{
    blob: Blob;
    fileName: string;
  }> {

    if (!this.invoice) {

      throw new Error(
        'Invoice information is unavailable.'
      );

    }


    /*
     * Dynamic imports are useful here because this project
     * uses Angular SSR. The PDF libraries are only loaded
     * after a browser user presses Download/Share.
     */
    const [
      jspdfModule,
      autoTableModule
    ] = await Promise.all([

      import('jspdf'),

      import('jspdf-autotable')

    ]);


    const jsPDF =
      jspdfModule.jsPDF;

    const autoTable =
      autoTableModule.autoTable;


    const invoice =
      this.invoice;


    const doc =
      new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });


    const pageWidth =
      doc.internal.pageSize
        .getWidth();


    const left =
      15;

    const right =
      pageWidth - 15;


    // --------------------------------------------------------
    // Heading
    // --------------------------------------------------------

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(
      24
    );

    doc.text(
      'INVOICE',
      left,
      20
    );


    doc.setFontSize(
      11
    );

    doc.text(
      invoice.invoice_number,
      right,
      19,
      {
        align: 'right'
      }
    );


    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(
      9
    );

    doc.text(
      `Status: ${invoice.status}`,
      right,
      25,
      {
        align: 'right'
      }
    );


    doc.setDrawColor(
      210
    );

    doc.line(
      left,
      31,
      right,
      31
    );


    // --------------------------------------------------------
    // Customer
    // --------------------------------------------------------

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(
      9
    );

    doc.text(
      'BILL TO',
      left,
      41
    );


    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(
      11
    );

    doc.text(
      invoice.customer_name ||
      `Customer #${invoice.customer_id}`,
      left,
      48
    );


    // --------------------------------------------------------
    // Dates
    // --------------------------------------------------------

    doc.setFontSize(
      9
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Invoice Date',
      120,
      41
    );

    doc.text(
      'Due Date',
      120,
      49
    );


    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.text(
      this.formatDate(
        invoice.invoice_date
      ),
      right,
      41,
      {
        align: 'right'
      }
    );

    doc.text(
      this.formatDate(
        invoice.due_date
      ),
      right,
      49,
      {
        align: 'right'
      }
    );


    // --------------------------------------------------------
    // Invoice Items
    // --------------------------------------------------------

    const itemRows =
      (
        invoice.items ??
        []
      ).map(
        item => [

          item.product_name ||
          `Product #${item.product_id}`,

          String(
            item.quantity
          ),

          `RM ${this.formatMoney(
            item.unit_price
          )}`,

          `RM ${this.formatMoney(
            item.discount
          )}`,

          `RM ${this.formatMoney(
            this.getItemTotal(
              item
            )
          )}`

        ]
      );


    autoTable(
      doc,
      {

        startY:
          60,

        margin: {
          left,
          right: 15
        },

        head: [[
          'Product',
          'Qty',
          'Unit Price',
          'Discount',
          'Total'
        ]],

        body:
          itemRows,

        theme:
          'grid',

        styles: {
          fontSize: 9,
          cellPadding: 3
        },

        headStyles: {
          fillColor: [
            55,
            65,
            81
          ],
          textColor: 255
        },

        columnStyles: {

          0: {
            cellWidth: 70
          },

          1: {
            halign: 'right',
            cellWidth: 15
          },

          2: {
            halign: 'right'
          },

          3: {
            halign: 'right'
          },

          4: {
            halign: 'right'
          }

        }

      }
    );


    const tableInfo =
      (
        doc as typeof doc & {
          lastAutoTable?: {
            finalY: number;
          };
        }
      ).lastAutoTable;


    let y =
      (
        tableInfo
          ?.finalY ??
        70
      ) + 10;


    // --------------------------------------------------------
    // Make sure totals fit
    // --------------------------------------------------------

    if (
      y > 225
    ) {

      doc.addPage();

      y =
        20;

    }


    const labelX =
      130;

    const amountX =
      right;


    doc.setFontSize(
      9
    );


    // Subtotal
    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.text(
      'Subtotal',
      labelX,
      y
    );

    doc.text(
      `RM ${this.formatMoney(
        invoice.subtotal
      )}`,
      amountX,
      y,
      {
        align: 'right'
      }
    );


    y +=
      7;


    // Discount
    doc.text(
      'Discount',
      labelX,
      y
    );

    doc.text(
      `RM ${this.formatMoney(
        invoice.discount
      )}`,
      amountX,
      y,
      {
        align: 'right'
      }
    );


    y +=
      7;


    // Tax
    doc.text(
      'Tax',
      labelX,
      y
    );

    doc.text(
      `RM ${this.formatMoney(
        invoice.tax
      )}`,
      amountX,
      y,
      {
        align: 'right'
      }
    );


    y +=
      4;


    doc.line(
      labelX,
      y,
      amountX,
      y
    );


    y +=
      7;


    // Total
    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(
      12
    );

    doc.text(
      'TOTAL',
      labelX,
      y
    );

    doc.text(
      `RM ${this.formatMoney(
        invoice.total
      )}`,
      amountX,
      y,
      {
        align: 'right'
      }
    );


    // --------------------------------------------------------
    // Payment information
    // --------------------------------------------------------

    if (
      this.paymentSummary
    ) {

      y +=
        14;


      doc.setFontSize(
        9
      );

      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.text(
        `Amount Paid: RM ${this.formatMoney(
          this.getAmountPaid()
        )}`,
        labelX,
        y
      );


      y +=
        6;


      doc.text(
        `Outstanding: RM ${this.formatMoney(
          this.getOutstandingBalance()
        )}`,
        labelX,
        y
      );

    }


    // --------------------------------------------------------
    // Notes
    // --------------------------------------------------------

    if (
      invoice.notes
    ) {

      y +=
        16;


      if (
        y > 255
      ) {

        doc.addPage();

        y =
          20;

      }


      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.setFontSize(
        9
      );

      doc.text(
        'Notes',
        left,
        y
      );


      y +=
        6;


      doc.setFont(
        'helvetica',
        'normal'
      );


      const noteLines =
        doc.splitTextToSize(
          invoice.notes,
          175
        );


      doc.text(
        noteLines,
        left,
        y
      );

    }


    // --------------------------------------------------------
    // Footer / page numbers
    // --------------------------------------------------------

    const pageCount =
      doc.getNumberOfPages();


    for (
      let page = 1;
      page <= pageCount;
      page++
    ) {

      doc.setPage(
        page
      );

      const pageHeight =
        doc.internal.pageSize
          .getHeight();


      doc.setFontSize(
        8
      );

      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.setTextColor(
        110
      );


      doc.text(
        `Invoice ${invoice.invoice_number}`,
        left,
        pageHeight - 8
      );


      doc.text(
        `Page ${page} of ${pageCount}`,
        right,
        pageHeight - 8,
        {
          align: 'right'
        }
      );

    }


    const blob =
      doc.output(
        'blob'
      );


    const safeInvoiceNumber =
      invoice.invoice_number
        .replace(
          /[^a-zA-Z0-9_-]/g,
          '_'
        );


    const fileName =
      `${safeInvoiceNumber}.pdf`;


    return {
      blob,
      fileName
    };

  }


  // ==========================================================
  // Download PDF
  // ==========================================================

  async downloadInvoicePdf(): Promise<void> {

    if (
      !this.invoice ||
      this.generatingPdf
    ) {
      return;
    }


    this.generatingPdf =
      true;

    this.shareMessage =
      '';


    try {

      const {
        blob,
        fileName
      } =
        await this.buildInvoicePdf();


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          'a'
        );


      link.href =
        url;

      link.download =
        fileName;


      document.body
        .appendChild(
          link
        );


      link.click();


      link.remove();


      URL.revokeObjectURL(
        url
      );


      this.shareMessage =
        'Invoice PDF downloaded successfully.';

    } catch (error) {

      console.error(
        'Failed to generate invoice PDF:',
        error
      );


      this.shareMessage =
        'Failed to generate invoice PDF.';

    } finally {

      this.generatingPdf =
        false;

    }

  }


  // ==========================================================
  // Share PDF
  // ==========================================================

  async shareInvoicePdf(): Promise<void> {

    if (
      !this.invoice ||
      this.sharingInvoice
    ) {
      return;
    }


    this.sharingInvoice =
      true;

    this.shareMessage =
      '';


    try {

      const {
        blob,
        fileName
      } =
        await this.buildInvoicePdf();


      const file =
        new File(
          [
            blob
          ],
          fileName,
          {
            type:
              'application/pdf'
          }
        );


      /*
       * Test whether this browser/device supports
       * sharing this particular PDF file.
       */
      const canShareFile =
        typeof navigator !==
          'undefined' &&
        typeof navigator.canShare ===
          'function' &&
        navigator.canShare({
          files: [
            file
          ]
        });


      if (
        canShareFile &&
        typeof navigator.share ===
          'function'
      ) {

        await navigator.share({

          files: [
            file
          ],

          title:
            `Invoice ${this.invoice.invoice_number}`,

          text:
            `Invoice ${this.invoice.invoice_number} - RM ${this.formatMoney(
              this.invoice.total
            )}`

        });


        this.shareMessage =
          'Invoice shared successfully.';

        return;

      }


      /*
       * Browser cannot share a PDF file.
       * Download it automatically instead.
       */
      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          'a'
        );


      link.href =
        url;

      link.download =
        fileName;


      document.body
        .appendChild(
          link
        );


      link.click();


      link.remove();


      URL.revokeObjectURL(
        url
      );


      this.shareMessage =
        'File sharing is not supported on this browser/device, so the PDF was downloaded instead.';

    } catch (error: unknown) {

      /*
       * AbortError normally means the user closed
       * the share dialog without selecting anything.
       */
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {

        this.shareMessage =
          '';

        return;

      }


      console.error(
        'Failed to share invoice:',
        error
      );


      this.shareMessage =
        'Unable to share the invoice PDF.';

    } finally {

      this.sharingInvoice =
        false;

    }

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
  // Item Helpers
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
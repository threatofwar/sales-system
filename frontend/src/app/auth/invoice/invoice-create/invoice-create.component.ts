import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  InvoiceService
} from '../../../core/auth/invoice/invoice.service';

import {
  Customer,
  CustomerService
} from '../../../core/auth/customer/customer.service';

import {
  Product,
  ProductService
} from '../../../core/auth/product/product.service';


interface InvoiceItemForm {
  product_id: number | null;
  quantity: number;
  unit_price: number;
  discount: number;
}


@Component({
  selector: 'app-invoice-create',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],

  templateUrl: './invoice-create.component.html',
  styleUrl: './invoice-create.component.scss'
})
export class InvoiceCreateComponent implements OnInit {

  invoiceForm!: FormGroup;

  customers: Customer[] = [];

  products: Product[] = [];

  items: InvoiceItemForm[] = [];

  loadingCustomers = false;

  loadingProducts = false;

  submitting = false;

  errorMessage = '';


  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private productService: ProductService,
    private router: Router
  ) {}


  ngOnInit(): void {

    this.invoiceForm = this.fb.group({

      invoice_number: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],

      customer_id: [
        null,
        Validators.required
      ],

      invoice_date: [
        this.getTodayDate(),
        Validators.required
      ],

      due_date: [
        ''
      ],

      /*
       * New invoices must always start as DRAFT.
       *
       * ISSUED happens later from the Edit page so the
       * backend can safely deduct stock.
       */
      status: [
        'DRAFT',
        Validators.required
      ],

      discount: [
        0,
        Validators.min(0)
      ],

      tax: [
        0,
        Validators.min(0)
      ],

      notes: [
        ''
      ]

    });

    this.loadCustomers();

    this.loadProducts();

    this.addItem();

  }


  // ============================================================
  // Date Helpers
  // ============================================================

  getTodayDate(): string {

    const today = new Date();

    return today
      .toISOString()
      .split('T')[0];

  }


  toISOString(
    date: string
  ): string {

    return `${date}T00:00:00Z`;

  }


  // ============================================================
  // Load Customers
  // ============================================================

  loadCustomers(): void {

    this.loadingCustomers = true;

    this.customerService
      .getCustomers()
      .subscribe({

        next: (response) => {

          this.customers =
            response;

          this.loadingCustomers =
            false;

        },

        error: (error) => {

          console.error(
            'Failed to load customers:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to load customers.';

          this.loadingCustomers =
            false;

        }

      });

  }


  // ============================================================
  // Load Products
  // ============================================================

  loadProducts(): void {

    this.loadingProducts = true;

    this.productService
      .getProducts()
      .subscribe({

        next: (response) => {

          this.products =
            response.products ?? [];

          this.loadingProducts =
            false;

        },

        error: (error) => {

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


  // ============================================================
  // Invoice Items
  // ============================================================

  addItem(): void {

    this.items.push({

      product_id: null,

      quantity: 1,

      unit_price: 0,

      discount: 0

    });

  }


  removeItem(
    index: number
  ): void {

    if (this.items.length === 1) {
      return;
    }

    this.items.splice(
      index,
      1
    );

  }


  onProductChange(
    index: number
  ): void {

    const item =
      this.items[index];

    if (!item.product_id) {

      item.unit_price = 0;

      return;
    }

    const product =
      this.getProductById(
        item.product_id
      );

    if (!product) {

      item.unit_price = 0;

      return;
    }

    item.unit_price =
      Number(product.price) || 0;

  }


  // ============================================================
  // Stock Helpers
  // ============================================================

  getProductById(
    productId: number | null
  ): Product | undefined {

    if (!productId) {
      return undefined;
    }

    return this.products.find(
      product =>
        Number(product.id) ===
        Number(productId)
    );

  }


  getAvailableStock(
    item: InvoiceItemForm
  ): number {

    const product =
      this.getProductById(
        item.product_id
      );

    if (!product) {
      return 0;
    }

    /*
     * Using this shape also keeps the component safe
     * if stock_quantity is optional in Product.
     */
    const stockProduct =
      product as Product & {
        stock_quantity?: number
      };

    return Number(
      stockProduct.stock_quantity ?? 0
    ) || 0;

  }


  /*
   * Total quantity requested for a particular product.
   *
   * This handles duplicate product rows.
   *
   * Example:
   * Product A row 1 = 6
   * Product A row 2 = 5
   *
   * Requested quantity = 11
   */
  getRequestedQuantityForProduct(
    productId: number | null
  ): number {

    if (!productId) {
      return 0;
    }

    return this.items
      .filter(
        item =>
          Number(item.product_id) ===
          Number(productId)
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          (
            Number(item.quantity) ||
            0
          ),
        0
      );

  }


  getRemainingStock(
    item: InvoiceItemForm
  ): number {

    if (!item.product_id) {
      return 0;
    }

    return (
      this.getAvailableStock(item) -
      this.getRequestedQuantityForProduct(
        item.product_id
      )
    );

  }


  hasStockShortage(
    item: InvoiceItemForm
  ): boolean {

    if (!item.product_id) {
      return false;
    }

    return (
      this.getRequestedQuantityForProduct(
        item.product_id
      ) >
      this.getAvailableStock(item)
    );

  }


  hasAnyStockShortage(): boolean {

    return this.items.some(
      item =>
        this.hasStockShortage(item)
    );

  }


  // ============================================================
  // Calculations
  // ============================================================

  getItemTotal(
    item: InvoiceItemForm
  ): number {

    const quantity =
      Number(item.quantity) || 0;

    const unitPrice =
      Number(item.unit_price) || 0;

    const discount =
      Number(item.discount) || 0;

    return Math.max(
      0,
      (
        quantity *
        unitPrice
      ) - discount
    );

  }


  getSubtotal(): number {

    return this.items.reduce(
      (
        total,
        item
      ) =>
        total +
        this.getItemTotal(item),
      0
    );

  }


  getInvoiceDiscount(): number {

    return Number(
      this.invoiceForm
        ?.get('discount')
        ?.value
    ) || 0;

  }


  getTax(): number {

    return Number(
      this.invoiceForm
        ?.get('tax')
        ?.value
    ) || 0;

  }


  getTotal(): number {

    return (
      this.getSubtotal() -
      this.getInvoiceDiscount() +
      this.getTax()
    );

  }


  // ============================================================
  // Customer Display
  // ============================================================

  getCustomerName(
    customer: Customer
  ): string {

    if (customer.display_name) {
      return customer.display_name;
    }

    return [
      customer.first_name,
      customer.last_name
    ]
      .filter(Boolean)
      .join(' ');

  }


  // ============================================================
  // Create Invoice
  // ============================================================

  createInvoice(): void {

    this.errorMessage = '';

    if (this.invoiceForm.invalid) {

      this.invoiceForm
        .markAllAsTouched();

      this.errorMessage =
        'Please complete all required invoice fields.';

      return;
    }

    if (this.items.length === 0) {

      this.errorMessage =
        'Please add at least one invoice item.';

      return;
    }

    const invoiceDate =
      this.invoiceForm
        .value
        .invoice_date;

    const dueDate =
      this.invoiceForm
        .value
        .due_date;

    if (
      dueDate &&
      invoiceDate &&
      dueDate < invoiceDate
    ) {

      this.errorMessage =
        'Due date cannot be before the invoice date.';

      return;
    }

    const invoiceDiscount =
      Number(
        this.invoiceForm
          .value
          .discount
      ) || 0;

    const invoiceTax =
      Number(
        this.invoiceForm
          .value
          .tax
      ) || 0;

    if (invoiceDiscount < 0) {

      this.errorMessage =
        'Invoice discount cannot be negative.';

      return;
    }

    if (invoiceTax < 0) {

      this.errorMessage =
        'Tax cannot be negative.';

      return;
    }

    for (
      let index = 0;
      index < this.items.length;
      index++
    ) {

      const item =
        this.items[index];

      const itemNumber =
        index + 1;

      if (!item.product_id) {

        this.errorMessage =
          `Please select a product for item ${itemNumber}.`;

        return;
      }

      if (
        !Number.isFinite(
          Number(item.quantity)
        ) ||
        Number(item.quantity) <= 0
      ) {

        this.errorMessage =
          `Quantity for item ${itemNumber} must be greater than zero.`;

        return;
      }

      if (
        !Number.isFinite(
          Number(item.unit_price)
        ) ||
        Number(item.unit_price) < 0
      ) {

        this.errorMessage =
          `Unit price for item ${itemNumber} cannot be negative.`;

        return;
      }

      if (
        !Number.isFinite(
          Number(item.discount)
        ) ||
        Number(item.discount) < 0
      ) {

        this.errorMessage =
          `Discount for item ${itemNumber} cannot be negative.`;

        return;
      }

      const itemSubtotal =
        Number(item.quantity) *
        Number(item.unit_price);

      if (
        Number(item.discount) >
        itemSubtotal
      ) {

        this.errorMessage =
          `Discount for item ${itemNumber} cannot exceed RM ${itemSubtotal.toFixed(2)}.`;

        return;
      }

    }

    const subtotal =
      this.getSubtotal();

    if (
      invoiceDiscount >
      subtotal
    ) {

      this.errorMessage =
        `Invoice discount cannot exceed the subtotal of RM ${subtotal.toFixed(2)}.`;

      return;
    }

    if (
      this.getTotal() < 0
    ) {

      this.errorMessage =
        'Invoice total cannot be negative.';

      return;
    }

    /*
     * IMPORTANT:
     *
     * We intentionally DO NOT block a DRAFT because of
     * insufficient stock.
     *
     * A draft can represent a future/planned sale.
     *
     * Stock will be checked again before the invoice
     * can become ISSUED.
     */

    const invoice = {

      invoice_number:
        this.invoiceForm
          .value
          .invoice_number
          .trim(),

      customer_id:
        Number(
          this.invoiceForm
            .value
            .customer_id
        ),

      invoice_date:
        this.toISOString(
          invoiceDate
        ),

      due_date:
        dueDate
          ? this.toISOString(
              dueDate
            )
          : undefined,

      /*
       * All new invoices start as DRAFT.
       */
      status:
        'DRAFT',

      discount:
        invoiceDiscount
          .toFixed(2),

      tax:
        invoiceTax
          .toFixed(2),

      notes:
        this.invoiceForm
          .value
          .notes
          ?.trim() ||
        undefined,

      items:
        this.items.map(
          item => ({

            product_id:
              Number(
                item.product_id
              ),

            quantity:
              Number(
                item.quantity
              ),

            unit_price:
              Number(
                item.unit_price
              ).toFixed(2),

            discount:
              Number(
                item.discount
              ).toFixed(2)

          })
        )

    };

    console.log(
      'Creating invoice:',
      invoice
    );

    this.submitting =
      true;

    this.invoiceService
      .createInvoice(
        invoice
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Invoice created:',
            response
          );

          this.submitting =
            false;

          this.router.navigate([
            '/invoice'
          ]);

        },

        error: (error) => {

          console.error(
            'Failed to create invoice:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to create invoice.';

          this.submitting =
            false;

        }

      });

  }


  // ============================================================
  // Cancel
  // ============================================================

  cancel(): void {

    this.router.navigate([
      '/invoice'
    ]);

  }

}
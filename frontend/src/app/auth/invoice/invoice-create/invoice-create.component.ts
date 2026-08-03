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

      status: [
        'DRAFT',
        Validators.required
      ],

      notes: [
        ''
      ]

    });


    this.loadCustomers();

    this.loadProducts();

    this.addItem();

  }


  /*
   * Return today's date in YYYY-MM-DD format.
   */
  getTodayDate(): string {

    const today = new Date();

    return today
      .toISOString()
      .split('T')[0];

  }


  /*
   * Load customers.
   *
   * Your GET /auth/customer endpoint
   * currently returns the array directly.
   */
  loadCustomers(): void {

    this.loadingCustomers = true;

    this.customerService
      .getCustomers()
      .subscribe({

        next: (response) => {

          console.log(
            'Customers loaded:',
            response
          );

          this.customers = response;

          this.loadingCustomers = false;

        },

        error: (error) => {

          console.error(
            'Failed to load customers:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to load customers.';

          this.loadingCustomers = false;

        }

      });

  }


  /*
   * Load products.
   *
   * Your GET /auth/product endpoint
   * returns:
   *
   * {
   *   "products": [...]
   * }
   */
  loadProducts(): void {

    this.loadingProducts = true;

    this.productService
      .getProducts()
      .subscribe({

        next: (response) => {

          console.log(
            'Products loaded:',
            response
          );

          this.products =
            response.products ?? [];

          this.loadingProducts = false;

        },

        error: (error) => {

          console.error(
            'Failed to load products:',
            error
          );

          this.errorMessage =
            error?.error?.error ||
            'Failed to load products.';

          this.loadingProducts = false;

        }

      });

  }


  /*
   * Add a new invoice item.
   */
  addItem(): void {

    this.items.push({

      product_id: null,

      quantity: 1,

      unit_price: 0,

      discount: 0

    });

  }


  /*
   * Remove an invoice item.
   *
   * Keep at least one item.
   */
  removeItem(index: number): void {

    if (this.items.length === 1) {

      return;

    }

    this.items.splice(index, 1);

  }


  /*
   * When the user selects a product,
   * automatically populate its selling price.
   */
  onProductChange(index: number): void {

    const item = this.items[index];

    if (!item.product_id) {

      item.unit_price = 0;

      return;

    }


    const product = this.products.find(
      p => p.id === Number(item.product_id)
    );


    if (!product) {

      return;

    }


    item.unit_price =
      Number(product.price);

  }


  /*
   * Calculate the total for one invoice item.
   */
  getItemTotal(
    item: InvoiceItemForm
  ): number {

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
   * Calculate invoice subtotal.
   */
  getSubtotal(): number {

    return this.items.reduce(

      (total, item) => {

        return total +
          this.getItemTotal(item);

      },

      0

    );

  }


  /*
   * Current total.
   *
   * At this stage we don't have
   * invoice-level tax/discount UI yet.
   */
  getTotal(): number {

    return this.getSubtotal();

  }


  /*
   * Get a customer's display name.
   */
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


  /*
   * Create the invoice.
   */
  createInvoice(): void {


    /*
     * Validate invoice header.
     */
    if (this.invoiceForm.invalid) {

      this.invoiceForm.markAllAsTouched();

      return;

    }


    /*
     * Make sure at least one item exists.
     */
    if (this.items.length === 0) {

      this.errorMessage =
        'Please add at least one invoice item.';

      return;

    }


    /*
     * Validate invoice items.
     */
    for (const item of this.items) {


      if (!item.product_id) {

        this.errorMessage =
          'Please select a product for every item.';

        return;

      }


      if (
        Number(item.quantity) <= 0
      ) {

        this.errorMessage =
          'Quantity must be greater than zero.';

        return;

      }


      if (
        Number(item.unit_price) < 0
      ) {

        this.errorMessage =
          'Unit price cannot be negative.';

        return;

      }


      if (
        Number(item.discount) < 0
      ) {

        this.errorMessage =
          'Discount cannot be negative.';

        return;

      }


      /*
       * Prevent discount from being greater
       * than the line value.
       */
      if (
        Number(item.discount) >
        (
          Number(item.quantity) *
          Number(item.unit_price)
        )
      ) {

        this.errorMessage =
          'Discount cannot be greater than the item total.';

        return;

      }

    }


    this.submitting = true;

    this.errorMessage = '';


    /*
     * Build the request body.
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
          this.invoiceForm
            .value
            .invoice_date
        ),


      due_date:
        this.invoiceForm
          .value
          .due_date
          ? this.toISOString(
              this.invoiceForm
                .value
                .due_date
            )
          : undefined,


      status:
        this.invoiceForm
          .value
          .status,


      notes:
        this.invoiceForm
          .value
          .notes
          ?.trim() ||
        undefined,


      items:
        this.items.map(item => ({

          product_id:
            Number(item.product_id),

          quantity:
            Number(item.quantity),

          unit_price:
            Number(item.unit_price).toFixed(2),

          discount:
            Number(item.discount).toFixed(2)

        }))

    };


    console.log(
      'Creating invoice:',
      invoice
    );


    /*
     * Send request to backend.
     */
    this.invoiceService
      .createInvoice(invoice)
      .subscribe({

        next: (response) => {

          console.log(
            'Invoice created:',
            response
          );


          this.submitting = false;


          /*
           * Return to invoice list.
           */
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


          this.submitting = false;

        }

      });

  }


  /*
   * Convert YYYY-MM-DD into
   * the ISO date format expected
   * by your Go backend.
   *
   * Example:
   *
   * 2026-08-03
   *
   * becomes:
   *
   * 2026-08-03T00:00:00Z
   */
  toISOString(
    date: string
  ): string {

    return `${date}T00:00:00Z`;

  }


  /*
   * Cancel invoice creation.
   */
  cancel(): void {

    this.router.navigate([
      '/invoice'
    ]);

  }

}
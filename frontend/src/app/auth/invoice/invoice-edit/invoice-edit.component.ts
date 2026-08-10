import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Invoice,
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

interface WrappedInvoiceResponse {
  invoice: Invoice;
  message?: string;
}

@Component({
  selector: 'app-invoice-edit',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],

  templateUrl: './invoice-edit.component.html',
  styleUrl: './invoice-edit.component.scss'
})
export class InvoiceEditComponent implements OnInit {

  invoiceForm!: FormGroup;

  invoiceId = 0;

  invoiceNumber = '';

  customers: Customer[] = [];

  products: Product[] = [];

  items: InvoiceItemForm[] = [];

  loading = false;

  loadingCustomers = false;

  loadingProducts = false;

  submitting = false;

  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {

    this.invoiceForm = this.fb.group({

      customer_id: [
        null,
        Validators.required
      ],

      invoice_date: [
        '',
        Validators.required
      ],

      due_date: [
        ''
      ],

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

    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!Number.isInteger(id) || id <= 0) {

      this.showError(
        'Invalid invoice ID.'
      );

      return;
    }

    this.invoiceId = id;

    this.loadCustomers();

    this.loadProducts();

    this.loadInvoice();

  }

  loadInvoice(): void {

    this.loading = true;

    this.errorMessage = '';

    this.invoiceService
      .getInvoice(this.invoiceId)
      .subscribe({

        next: (response) => {

          console.log(
            'Invoice loaded:',
            response
          );

          const invoice =
            this.extractInvoice(response);

          this.invoiceNumber =
            invoice.invoice_number;

          this.invoiceForm.patchValue({

            customer_id:
              invoice.customer_id,

            invoice_date:
              this.toDateInput(
                invoice.invoice_date
              ),

            due_date:
              this.toDateInput(
                invoice.due_date
              ),

            status:
              invoice.status,

            discount:
              Number(
                invoice.discount ?? 0
              ),

            tax:
              Number(
                invoice.tax ?? 0
              ),

            notes:
              invoice.notes ?? ''

          });

          this.items =
            (invoice.items ?? [])
              .map(item => ({

                product_id:
                  item.product_id,

                quantity:
                  Number(
                    item.quantity
                  ),

                unit_price:
                  Number(
                    item.unit_price ?? 0
                  ),

                discount:
                  Number(
                    item.discount ?? 0
                  )

              }));

          if (this.items.length === 0) {

            this.addItem();

          }

          this.loading = false;

        },

        error: (error) => {

          console.error(
            'Failed to load invoice:',
            error
          );

          this.loading = false;

          this.showError(
            error?.error?.error ||
            'Failed to load invoice.'
          );

        }

      });

  }

  private extractInvoice(
    response: Invoice | WrappedInvoiceResponse
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

  loadCustomers(): void {

    this.loadingCustomers = true;

    this.customerService
      .getCustomers()
      .subscribe({

        next: (response) => {

          this.customers =
            Array.isArray(response)
              ? response
              : [];

          this.loadingCustomers = false;

        },

        error: (error) => {

          console.error(
            'Failed to load customers:',
            error
          );

          this.loadingCustomers = false;

          this.showError(
            error?.error?.error ||
            'Failed to load customers.'
          );

        }

      });

  }

  loadProducts(): void {

    this.loadingProducts = true;

    this.productService
      .getProducts()
      .subscribe({

        next: (response) => {

          this.products =
            response.products ?? [];

          this.loadingProducts = false;

        },

        error: (error) => {

          console.error(
            'Failed to load products:',
            error
          );

          this.loadingProducts = false;

          this.showError(
            error?.error?.error ||
            'Failed to load products.'
          );

        }

      });

  }

  addItem(): void {

    this.items.push({

      product_id: null,

      quantity: 1,

      unit_price: 0,

      discount: 0

    });

  }

  removeItem(index: number): void {

    if (this.items.length <= 1) {

      this.showError(
        'An invoice must contain at least one item.'
      );

      return;
    }

    this.items.splice(
      index,
      1
    );

    this.errorMessage = '';

  }

  onProductChange(index: number): void {

    const item =
      this.items[index];

    if (!item.product_id) {

      item.unit_price = 0;

      return;
    }

    const product =
      this.products.find(
        product =>
          product.id ===
          Number(item.product_id)
      );

    if (!product) {

      item.unit_price = 0;

      return;
    }

    item.unit_price =
      Number(product.price) || 0;

  }

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
      quantity * unitPrice - discount
    );

  }

  getSubtotal(): number {

    return this.items.reduce(
      (
        total,
        item
      ) => total + this.getItemTotal(item),
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

  updateInvoice(): void {

    console.log(
      'Update Invoice button clicked'
    );

    console.log(
      'Form value:',
      this.invoiceForm.value
    );

    console.log(
      'Form valid:',
      this.invoiceForm.valid
    );

    this.errorMessage = '';

    if (this.invoiceForm.invalid) {

      this.invoiceForm.markAllAsTouched();

      this.showError(
        'Please complete all required invoice fields.'
      );

      return;
    }

    if (this.items.length === 0) {

      this.showError(
        'Please add at least one invoice item.'
      );

      return;
    }

    const invoiceDate =
      this.invoiceForm.value.invoice_date;

    const dueDate =
      this.invoiceForm.value.due_date;

    if (
      dueDate &&
      invoiceDate &&
      dueDate < invoiceDate
    ) {

      this.showError(
        'Due date cannot be before the invoice date.'
      );

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

        this.showError(
          `Please select a product for item ${itemNumber}.`
        );

        return;
      }

      if (
        !Number.isFinite(
          Number(item.quantity)
        ) ||
        Number(item.quantity) <= 0
      ) {

        this.showError(
          `Quantity for item ${itemNumber} must be greater than zero.`
        );

        return;
      }

      if (
        !Number.isFinite(
          Number(item.unit_price)
        ) ||
        Number(item.unit_price) < 0
      ) {

        this.showError(
          `Unit price for item ${itemNumber} cannot be negative.`
        );

        return;
      }

      if (
        !Number.isFinite(
          Number(item.discount)
        ) ||
        Number(item.discount) < 0
      ) {

        this.showError(
          `Discount for item ${itemNumber} cannot be negative.`
        );

        return;
      }

      const itemSubtotal =
        Number(item.quantity) *
        Number(item.unit_price);

      if (
        Number(item.discount) >
        itemSubtotal
      ) {

        this.showError(
          `Discount for item ${itemNumber} cannot exceed RM ${itemSubtotal.toFixed(2)}.`
        );

        return;
      }

    }

    const subtotal =
      this.getSubtotal();

    const invoiceDiscount =
      this.getInvoiceDiscount();

    const tax =
      this.getTax();

    if (
      !Number.isFinite(invoiceDiscount) ||
      invoiceDiscount < 0
    ) {

      this.showError(
        'Invoice discount cannot be negative.'
      );

      return;
    }

    if (
      invoiceDiscount >
      subtotal
    ) {

      this.showError(
        `Invoice discount cannot exceed the subtotal of RM ${subtotal.toFixed(2)}.`
      );

      return;
    }

    if (
      !Number.isFinite(tax) ||
      tax < 0
    ) {

      this.showError(
        'Tax cannot be negative.'
      );

      return;
    }

    if (this.getTotal() < 0) {

      this.showError(
        'Invoice total cannot be negative.'
      );

      return;
    }

    const payload = {

      customer_id:
        Number(
          this.invoiceForm.value.customer_id
        ),

      invoice_date:
        this.toISOString(
          invoiceDate
        ),

      due_date:
        dueDate
          ? this.toISOString(dueDate)
          : null,

      status:
        String(
          this.invoiceForm.value.status
        ).trim().toUpperCase(),

      discount:
        invoiceDiscount.toFixed(2),

      tax:
        tax.toFixed(2),

      notes:
        this.invoiceForm.value.notes
          ?.trim() ||
        null,

      items:
        this.items.map(item => ({

          product_id:
            Number(item.product_id),

          quantity:
            Number(item.quantity),

          unit_price:
            Number(item.unit_price)
              .toFixed(2),

          discount:
            Number(item.discount)
              .toFixed(2)

        }))

    };

    console.log(
      'Updating invoice payload:',
      payload
    );

    this.submitting = true;

    this.invoiceService
      .updateInvoice(
        this.invoiceId,
        payload
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Invoice updated:',
            response
          );

          this.submitting = false;

          this.router.navigate([
            '/invoice',
            this.invoiceId
          ]);

        },

        error: (error) => {

          console.error(
            'Failed to update invoice:',
            error
          );

          this.submitting = false;

          this.showError(
            error?.error?.error ||
            'Failed to update invoice.'
          );

        }

      });

  }

  private showError(
    message: string
  ): void {

    this.errorMessage =
      message;

    setTimeout(() => {

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

    });

  }

  toDateInput(
    value?: string | null
  ): string {

    if (!value) {

      return '';

    }

    return value.split('T')[0];

  }

  toISOString(
    date: string
  ): string {

    return `${date}T00:00:00Z`;

  }

  cancel(): void {

    this.router.navigate([
      '/invoice',
      this.invoiceId
    ]);

  }

}
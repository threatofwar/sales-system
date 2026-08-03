import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import {
  StockTransaction,
  StockTransactionService
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
    ReactiveFormsModule
  ],

  templateUrl: './stock-transaction.component.html',
  styleUrl: './stock-transaction.component.scss'
})
export class StockTransactionComponent implements OnInit {

  transactionForm!: FormGroup;

  products: Product[] = [];

  loading = false;

  loadingProducts = false;

  submitting = false;

  errorMessage = '';

  successMessage = '';


  constructor(
    private fb: FormBuilder,
    private stockTransactionService: StockTransactionService,
    private productService: ProductService
  ) {}


  ngOnInit(): void {

    this.transactionForm = this.fb.group({

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
        Validators.maxLength(1000)
      ]

    });


    this.loadProducts();

  }


  loadProducts(): void {

    this.loadingProducts = true;

    this.errorMessage = '';

    this.productService.getProducts().subscribe({

      next: (response) => {

        console.log('Products loaded:', response);

        this.products = response.products ?? [];

        this.loadingProducts = false;

      },

      error: (error) => {

        console.error('Failed to load products:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to load products.';

        this.loadingProducts = false;

      }

    });

  }


  onTransactionTypeChange(): void {

    const transactionType =
      this.transactionForm.get('transaction_type')?.value;

    const quantityControl =
      this.transactionForm.get('quantity');

    if (!quantityControl) {
      return;
    }


    quantityControl.clearValidators();


    if (transactionType === 'ADJUSTMENT') {

      quantityControl.setValidators([
        Validators.required,
        this.nonZeroValidator
      ]);

    } else {

      quantityControl.setValidators([
        Validators.required,
        Validators.min(1)
      ]);

    }


    quantityControl.updateValueAndValidity();

  }


  nonZeroValidator(
    control: AbstractControl
  ): ValidationErrors | null {

    if (
      control.value === null ||
      control.value === ''
    ) {
      return null;
    }


    const value = Number(control.value);


    if (isNaN(value)) {
      return {
        invalidNumber: true
      };
    }


    if (value === 0) {
      return {
        zero: true
      };
    }


    return null;

  }


  createTransaction(): void {

    if (this.transactionForm.invalid) {

      this.transactionForm.markAllAsTouched();

      return;

    }


    this.submitting = true;

    this.errorMessage = '';

    this.successMessage = '';


    const transaction: StockTransaction = {

      product_id: Number(
        this.transactionForm.value.product_id
      ),

      transaction_type:
        this.transactionForm.value.transaction_type,

      quantity:
        Number(this.transactionForm.value.quantity),

      notes:
        this.transactionForm.value.notes?.trim() ||
        undefined

    };


    console.log(
      'Creating stock transaction:',
      transaction
    );


    this.stockTransactionService
      .createStockTransaction(transaction)
      .subscribe({

        next: (response) => {

          console.log(
            'Stock transaction created:',
            response
          );


          this.successMessage =
            response?.message ||
            'Stock transaction created successfully.';


          this.submitting = false;


          this.transactionForm.reset({

            product_id: null,

            transaction_type: 'STOCK_IN',

            quantity: null,

            notes: ''

          });


          this.onTransactionTypeChange();

        },


        error: (error) => {

          console.error(
            'Failed to create stock transaction:',
            error
          );


          this.errorMessage =
            error?.error?.error ||
            'Failed to create stock transaction.';


          this.submitting = false;

        }

      });

  }


  get quantityControl(): AbstractControl | null {

    return this.transactionForm.get('quantity');

  }


  get transactionType(): string {

    return this.transactionForm.get(
      'transaction_type'
    )?.value;

  }

}
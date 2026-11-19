import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Product,
  ProductService
} from '../../../core/auth/product/product.service';

import {
  Category,
  CategoryService
} from '../../../core/auth/category/category.service';

@Component({
  selector: 'app-product-create',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './product-create.component.html',
  styleUrl: './product-create.component.scss'
})
export class ProductCreateComponent implements OnInit {

  productForm!: FormGroup;

  categories: Category[] = [];

  loadingCategories = false;

  submitting = false;

  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.productForm = this.fb.group({

      category_id: [
        null,
        Validators.required
      ],

      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],

      description: [
        '',
        Validators.maxLength(5000)
      ],

      sku: [
        '',
        Validators.maxLength(50)
      ],

      price: [
        null,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      cost_price: [
        null,
        Validators.min(0)
      ],

      stock_quantity: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      is_active: [
        true
      ]

    });

    this.loadCategories();

  }


  loadCategories(): void {

    this.loadingCategories = true;

    this.categoryService.getCategories().subscribe({

      next: (response) => {

        console.log('Categories loaded:', response);

        this.categories = response.categories ?? [];

        this.loadingCategories = false;

      },

      error: (error) => {

        console.error('Failed to load categories:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to load categories.';

        this.loadingCategories = false;

      }

    });

  }


  createProduct(): void {

    if (this.productForm.invalid) {

      this.productForm.markAllAsTouched();

      return;

    }

    this.submitting = true;

    this.errorMessage = '';

    const product: Product = {

      category_id: Number(
        this.productForm.value.category_id
      ),

      name: this.productForm.value.name.trim(),

      description:
        this.productForm.value.description?.trim() || undefined,

      sku:
        this.productForm.value.sku?.trim() || undefined,

      price: Number(
        this.productForm.value.price
      ),

      cost_price:
        this.productForm.value.cost_price !== null &&
        this.productForm.value.cost_price !== ''
          ? Number(this.productForm.value.cost_price)
          : undefined,

      stock_quantity: Number(
        this.productForm.value.stock_quantity
      ),

      is_active:
        this.productForm.value.is_active

    };

    console.log('Creating product:', product);

    this.productService.createProduct(product).subscribe({

      next: (response) => {

        console.log('Product created:', response);

        this.submitting = false;

        this.router.navigate(['/product']);

      },

      error: (error) => {

        console.error('Failed to create product:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to create product.';

        this.submitting = false;

      }

    });

  }


  cancel(): void {

    this.router.navigate(['/product']);

  }

}
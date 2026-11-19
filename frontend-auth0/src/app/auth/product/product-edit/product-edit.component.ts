import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-product-edit',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './product-edit.component.html',
  styleUrl: './product-edit.component.scss'
})
export class ProductEditComponent implements OnInit {

  productForm!: FormGroup;

  categories: Category[] = [];

  productId!: number;

  loading = false;

  loadingCategories = false;

  submitting = false;

  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
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

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {

      this.errorMessage = 'Product ID is missing.';

      return;

    }

    this.productId = Number(id);

    if (isNaN(this.productId)) {

      this.errorMessage = 'Invalid product ID.';

      return;

    }

    this.loadCategories();

    this.loadProduct();

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


  loadProduct(): void {

  this.loading = true;
  this.errorMessage = '';

  this.productService.getProduct(this.productId).subscribe({

    next: (response) => {

      console.log('Product loaded:', response);

      const product: Product = response.product;

      this.productForm.patchValue({

        category_id: product.category_id,

        name: product.name,

        description: product.description ?? '',

        sku: product.sku ?? '',

        price: product.price,

        cost_price: product.cost_price ?? null,

        stock_quantity: product.stock_quantity,

        is_active: product.is_active

      });

      this.loading = false;

    },

    error: (error) => {

      console.error('Failed to load product:', error);

      this.errorMessage =
        error?.error?.error ||
        'Failed to load product.';

      this.loading = false;

    }

  });

}


  updateProduct(): void {

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

      name:
        this.productForm.value.name.trim(),

      description:
        this.productForm.value.description?.trim() || undefined,

      sku:
        this.productForm.value.sku?.trim() || undefined,

      price:
        Number(this.productForm.value.price),

      cost_price:
        this.productForm.value.cost_price !== null &&
        this.productForm.value.cost_price !== ''
          ? Number(this.productForm.value.cost_price)
          : undefined,

      stock_quantity:
        Number(this.productForm.value.stock_quantity),

      is_active:
        this.productForm.value.is_active

    };

    console.log('Updating product:', product);

    this.productService.updateProduct(
      this.productId,
      product
    ).subscribe({

      next: (response) => {

        console.log('Product updated:', response);

        this.submitting = false;

        this.router.navigate(['/product']);

      },

      error: (error) => {

        console.error('Failed to update product:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to update product.';

        this.submitting = false;

      }

    });

  }


  cancel(): void {

    this.router.navigate(['/product']);

  }

}
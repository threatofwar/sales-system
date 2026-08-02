import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  Product,
  ProductService
} from '../../core/auth/product/product.service';

@Component({
  selector: 'app-product',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent implements OnInit {

  products: Product[] = [];

  loading = false;

  errorMessage = '';

  constructor(
    private productService: ProductService
  ) {}

  ngOnInit(): void {

    this.loadProducts();

  }

  loadProducts(): void {

    this.loading = true;

    this.errorMessage = '';

    this.productService.getProducts().subscribe({

      next: (response) => {

        console.log('Products loaded:', response);

        this.products = response.products ?? [];

        this.loading = false;

      },

      error: (error) => {

        console.error('Failed to load products:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to load products.';

        this.loading = false;

      }

    });

  }

  deleteProduct(id: number): void {

    const confirmed = confirm(
      'Are you sure you want to delete this product?'
    );

    if (!confirmed) {
      return;
    }

    this.productService.deleteProduct(id).subscribe({

      next: (response) => {

        console.log('Product deleted:', response);

        this.loadProducts();

      },

      error: (error) => {

        console.error('Failed to delete product:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to delete product.';

      }

    });

  }

}
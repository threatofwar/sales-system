import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CategoryService,
  Category
} from '../../../core/auth/category/category.service';


@Component({
  selector: 'app-category-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './category-edit.component.html',
  styleUrl: './category-edit.component.scss'
})
export class CategoryEditComponent implements OnInit {

  category: Category = {
    name: '',
    description: ''
  };

  categoryId!: number;

  loading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';


  constructor(
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}


  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'Category ID is missing.';
      return;
    }

    this.categoryId = Number(id);

    if (isNaN(this.categoryId)) {
      this.errorMessage = 'Invalid category ID.';
      return;
    }

    this.loadCategory();

  }


  loadCategory(): void {

    this.loading = true;
    this.errorMessage = '';

    this.categoryService.getCategory(this.categoryId).subscribe({

      next: (response) => {

        console.log('Category loaded:', response);

        /*
         * Depending on your backend response,
         * the category may be returned directly
         * or inside a "category" property.
         */
        this.category = response;

        this.loading = false;

      },

      error: (error) => {

        console.error('Failed to load category:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to load category.';

        this.loading = false;

      }

    });

  }


  updateCategory(): void {

    this.errorMessage = '';
    this.successMessage = '';

    this.category.name = this.category.name.trim();

    if (!this.category.name) {

      this.errorMessage = 'Category name is required.';

      return;

    }

    this.saving = true;

    this.categoryService
      .updateCategory(this.categoryId, this.category)
      .subscribe({

        next: (response) => {

          console.log('Category updated:', response);

          this.saving = false;

          this.successMessage = 'Category updated successfully.';

          /*
           * Give the user a moment to see
           * the success message before returning.
           */
          setTimeout(() => {
            this.router.navigate(['/category']);
          }, 500);

        },

        error: (error) => {

          console.error('Failed to update category:', error);

          this.errorMessage =
            error?.error?.error ||
            'Failed to update category.';

          this.saving = false;

        }

      });

  }

}
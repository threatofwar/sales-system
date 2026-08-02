import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategoryService, Category } from '../../core/auth/category/category.service';
import { PageHeaderComponent } from '../../auth/layout/components/page-header/page-header.component';
import { SearchBoxComponent } from '../../auth/layout/components/search-box/search-box.component';


@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    PageHeaderComponent,
    SearchBoxComponent
  ],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss'
})
export class CategoryComponent implements OnInit {

  categories: Category[] = [];

  loading = false;

  errorMessage = '';


  constructor(
    private categoryService: CategoryService
  ) {}


  ngOnInit(): void {

    this.loadCategories();

  }


  loadCategories(): void {

    this.loading = true;

    this.errorMessage = '';


    this.categoryService.getCategories().subscribe({

      next: (response) => {

        console.log('Categories loaded:', response);

        this.categories = response.categories ?? [];

        this.loading = false;

      },

      error: (error) => {

        console.error('Failed to load categories:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to load categories.';

        this.loading = false;

      }

    });

  }

  deleteCategory(id: number): void {

  if (!confirm('Are you sure you want to delete this category?')) {
    return;
  }

  this.categoryService.deleteCategory(id).subscribe({

    next: () => {
      this.loadCategories();
    },

    error: (error) => {
      console.error('Failed to delete category:', error);

      this.errorMessage =
        error?.error?.error ||
        'Failed to delete category.';
    }

  });
}

}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CategoryService, Category } from '../../../core/auth/category/category.service';
import { PageHeaderComponent } from '../../../auth/layout/components/page-header/page-header.component';


@Component({
  selector: 'app-category-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent
  ],
  templateUrl: './category-create.component.html',
  styleUrl: './category-create.component.scss'
})
export class CategoryCreateComponent {

  category: Category = {
    name: '',
    description: ''
  };

  loading = false;

  errorMessage = '';


  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {}


  createCategory(): void {

    this.errorMessage = '';


    const name = this.category.name.trim();


    if (!name) {

      this.errorMessage = 'Category name is required.';

      return;

    }


    this.category.name = name;


    this.loading = true;


    this.categoryService.createCategory(this.category).subscribe({

      next: (response) => {

        console.log('Category created:', response);

        this.loading = false;

        this.router.navigate(['/category']);

      },

      error: (error) => {

        console.error('Failed to create category:', error);

        this.errorMessage =
          error?.error?.error ||
          'Failed to create category.';

        this.loading = false;

      }

    });

  }

}
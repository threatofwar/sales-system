import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';


import {
  Customer,
  CustomerService
} from '../../core/auth/customer/customer.service';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './company.component.html',
  styleUrl: './company.component.scss'
})
export class CompanyComponent implements OnInit {

  customers: Customer[] = [];

  loading = false;
  private platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private customerService: CustomerService
  ) { }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    console.log(
      new Date().toISOString(),
      'CustomerComponent initialized',
      {
        browser: isPlatformBrowser(this.platformId),
        server: isPlatformServer(this.platformId)
      }
    );
    

    if (!isPlatformBrowser(this.platformId)) {
      console.log('Skipping API call during SSR');
      return;
    }

    this.loading = true;

    this.customerService.getCustomers().subscribe({
      next: (response) => {
        console.log(
          new Date().toISOString(),
          'Customers loaded',
          response
        );

        this.customers = response;
        this.loading = false;
      },
      error: (error) => {
        console.error(
          new Date().toISOString(),
          'Customers failed',
          error
        );

        this.loading = false;
      }
    });
  }
  

  loadCustomersOld(): void {

  console.log('loadCustomers() called');

  this.loading = true;

  this.customerService.getCustomers().subscribe({

    next: (customers) => {

      console.log('Customers received:', customers);

      this.customers = customers;

      this.loading = false;

    },

    error: (err) => {

      console.error('loadCustomers() failed:', err);

      this.loading = false;

    }

  });

}

  getPrimaryEmail(customer: Customer): string {
  return customer.emails?.find(
    email => email.is_primary
  )?.email ?? '-';
}

  addCustomer(): void {
    this.router.navigate(['/customer/new']);
  }

  deleteCustomer(id: number): void {

  if (!confirm('Are you sure you want to delete this customer?')) {
    return;
  }

  this.customerService.deleteCustomer(id).subscribe({

    next: () => {

      console.log('Customer deleted');

      // Option 1: Reload customers
      this.loadCustomers();

    },

    error: (err) => {
      console.error('Failed to delete customer', err);
    }

  });

}

  editCustomer(id: number): void {
    this.router.navigate(['/customer', id, 'edit']);
  }

}
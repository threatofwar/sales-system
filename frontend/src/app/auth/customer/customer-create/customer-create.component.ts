import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, FormGroup, FormControl, ReactiveFormsModule, Validators, ValidationErrors, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { CustomerService } from '../../../core/auth/customer/customer.service';

@Component({
  selector: 'app-customer-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    FormsModule
  ],
  templateUrl: './customer-create.component.html',
  styleUrl: './customer-create.component.scss'
})
export class CustomerCreateComponent {
    customerForm = new FormGroup({
    first_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),

    last_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),

    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email]
    }),

    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),

    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  countryCode = '+60';

  phone = '';

  countries = [
    {
      name: 'Malaysia',
      code: '+60'
    },
    {
      name: 'Singapore',
      code: '+65'
    },
    {
      name: 'Indonesia',
      code: '+62'
    },
    {
      name: 'Thailand',
      code: '+66'
    },
    {
      name: 'United States',
      code: '+1'
    },
    {
      name: 'United Kingdom',
      code: '+44'
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private customerService: CustomerService
  ) {}

  logout() {
    this.authService.logout().subscribe({
      next: () => console.log('Logout successful'),
      error: (err) => console.error('Logout failed', err)
    });
  }

  handleSubmit(): void {
  if (this.customerForm.invalid) {
    this.customerForm.markAllAsTouched();
    return;
  }

  const formData = this.customerForm.getRawValue();

const postData = {
  first_name: formData.first_name,
  last_name: formData.last_name,
  phone: formData.phone,
  address: formData.address,

  emails: [
    {
      email: formData.email,
      is_primary: true
    }
  ]
};

  this.customerService.createCustomer(postData).subscribe({
      next: (customer) => {
        console.log('Customer created successfully:', customer);
        this.router.navigate(['/customer']);
      },
      error: (err) => {
        console.error('Failed to create customer:', err);
      }
    });
}

  handleCancel() {
    this.router.navigate(['/customer']);
  }
}
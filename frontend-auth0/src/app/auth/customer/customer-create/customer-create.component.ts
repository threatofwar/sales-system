import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { CustomerService } from '../../../core/auth/customer/customer.service';
import { distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-customer-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './customer-create.component.html',
  styleUrl: './customer-create.component.scss'
})
export class CustomerCreateComponent {

  customerForm = new FormGroup({

    type: new FormControl("PERSON", {
      nonNullable: true,
      validators: [Validators.required]
    }),

    first_name: new FormControl('', {
      nonNullable: true
    }),

    last_name: new FormControl('', {
      nonNullable: true
    }),

    company_name: new FormControl('', {
      nonNullable: true
    }),

    identification_no: new FormControl('', {
      nonNullable: true
    }),

    registration_no: new FormControl('', {
      nonNullable: true
    }),

    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email
      ]
    }),

    phone: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),

    address: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })

  });


  get isPerson(): boolean {
    return this.customerForm.get('type')?.value === 'PERSON';
  }


  get isCompany(): boolean {
    return this.customerForm.get('type')?.value === 'COMPANY';
  }


  constructor(
    private router: Router,
    private authService: AuthService,
    private customerService: CustomerService
  ) {}


  ngOnInit(): void {

    const typeControl = this.customerForm.get('type');


    const updateValidation = (type: string | null) => {

      const firstName = this.customerForm.get('first_name');
      const lastName = this.customerForm.get('last_name');
      const identificationNo = this.customerForm.get('identification_no');

      const companyName = this.customerForm.get('company_name');
      const registrationNo = this.customerForm.get('registration_no');


      if (type === "PERSON") {

        // PERSON required fields
        firstName?.setValidators([
          Validators.required
        ]);

        lastName?.setValidators([
          Validators.required
        ]);

        identificationNo?.setValidators([
          Validators.required
        ]);


        // COMPANY not required
        companyName?.clearValidators();
        registrationNo?.clearValidators();


        // clear unused fields
        companyName?.setValue("");
        registrationNo?.setValue("");

      }


      if (type === "COMPANY") {

        // COMPANY required fields
        companyName?.setValidators([
          Validators.required
        ]);

        registrationNo?.setValidators([
          Validators.required
        ]);


        // PERSON not required
        firstName?.clearValidators();
        lastName?.clearValidators();
        identificationNo?.clearValidators();


        // clear unused fields
        firstName?.setValue("");
        lastName?.setValue("");
        identificationNo?.setValue("");

      }


      firstName?.updateValueAndValidity();
      lastName?.updateValueAndValidity();
      identificationNo?.updateValueAndValidity();

      companyName?.updateValueAndValidity();
      registrationNo?.updateValueAndValidity();

    };


    // listen for dropdown change
    typeControl?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(type => {

        updateValidation(type);

      });


    // initialise default value
    updateValidation(typeControl?.value ?? null);

  }



  handleSubmit(): void {

    if (this.customerForm.invalid) {

      this.customerForm.markAllAsTouched();

      return;
    }


    const formData = this.customerForm.getRawValue();


    const postData = {

      type: formData.type,


      first_name: this.isPerson
        ? formData.first_name
        : null,


      last_name: this.isPerson
        ? formData.last_name
        : null,


      identification_no: this.isPerson
        ? formData.identification_no
        : null,


      company_name: this.isCompany
        ? formData.company_name
        : null,


      registration_no: this.isCompany
        ? formData.registration_no
        : null,


      phone: formData.phone,


      address: formData.address,


      emails: [
        {
          email: formData.email,
          is_primary: true
        }
      ]

    };


    console.log("Create Customer Payload:", postData);


    this.customerService.createCustomer(postData)
      .subscribe({

        next: (customer) => {

          console.log(
            "Customer created successfully:",
            customer
          );

          this.router.navigate(['/customer']);

        },


        error: (err) => {

          console.error(
            "Failed to create customer:",
            err
          );

        }

      });

  }



  logout() {

    this.authService.logout()
      .subscribe({

        next: () =>
          console.log('Logout successful'),

        error: (err) =>
          console.error('Logout failed', err)

      });

  }



  handleCancel() {

    this.router.navigate(['/customer']);

  }

}
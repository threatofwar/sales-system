import { Component, OnInit, inject, PLATFORM_ID } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { CommonModule, isPlatformBrowser, isPlatformServer } from "@angular/common";
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators
} from "@angular/forms";
import { distinctUntilChanged } from "rxjs";

import { AuthService } from "../../../core/auth/auth.service";
import { CustomerService } from "../../../core/auth/customer/customer.service";


@Component({
  selector: "app-customer-edit",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: "./customer-edit.component.html",
  styleUrl: "./customer-edit.component.scss",
})
export class CustomerEditComponent implements OnInit {


  private platformId = inject(PLATFORM_ID);


  customerId = 0;


  customerForm = new FormGroup({

    type: new FormControl("PERSON", {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),


    first_name: new FormControl("", {
      nonNullable: true
    }),


    last_name: new FormControl("", {
      nonNullable: true
    }),


    identification_no: new FormControl("", {
      nonNullable: true
    }),


    company_name: new FormControl("", {
      nonNullable: true
    }),


    registration_no: new FormControl("", {
      nonNullable: true
    }),


    email: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email
      ]
    }),


    phone: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),


    address: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })

  });



  get isPerson(): boolean {

    return this.customerForm.get("type")?.value === "PERSON";

  }


  get isCompany(): boolean {

    return this.customerForm.get("type")?.value === "COMPANY";

  }



  constructor(

    private router: Router,

    private route: ActivatedRoute,

    private authService: AuthService,

    private customerService: CustomerService

  ) {}




  ngOnInit(): void {


    const typeControl = this.customerForm.get("type");


    const updateValidation = (type: string | null) => {


      const firstName =
        this.customerForm.get("first_name");


      const lastName =
        this.customerForm.get("last_name");


      const identificationNo =
        this.customerForm.get("identification_no");


      const companyName =
        this.customerForm.get("company_name");


      const registrationNo =
        this.customerForm.get("registration_no");




      if (type === "PERSON") {


        firstName?.setValidators([
          Validators.required
        ]);


        lastName?.setValidators([
          Validators.required
        ]);


        identificationNo?.setValidators([
          Validators.required
        ]);



        companyName?.clearValidators();

        registrationNo?.clearValidators();


      }



      if (type === "COMPANY") {


        companyName?.setValidators([
          Validators.required
        ]);


        registrationNo?.setValidators([
          Validators.required
        ]);



        firstName?.clearValidators();

        lastName?.clearValidators();

        identificationNo?.clearValidators();


      }



      firstName?.updateValueAndValidity();

      lastName?.updateValueAndValidity();

      identificationNo?.updateValueAndValidity();

      companyName?.updateValueAndValidity();

      registrationNo?.updateValueAndValidity();


    };



    typeControl?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(type => {

        updateValidation(type);

      });



    updateValidation(typeControl?.value ?? null);



    const id =
      this.route.snapshot.paramMap.get("id");


    if (id) {

      this.customerId = Number(id);

      this.loadCustomer(this.customerId);

    }


  }





  loadCustomer(id: number): void {


    console.log(
      "CustomerEditComponent",
      {
        browser: isPlatformBrowser(this.platformId),
        server: isPlatformServer(this.platformId)
      }
    );



    if (!isPlatformBrowser(this.platformId)) {

      console.log(
        "Skipping API call during SSR"
      );

      return;

    }




    this.customerService.getCustomer(id)
      .subscribe({


        next: (customer) => {



          this.customerForm.patchValue({

            type: customer.type,


            first_name:
              customer.first_name ?? "",


            last_name:
              customer.last_name ?? "",


            identification_no:
              customer.identification_no ?? "",


            company_name:
              customer.company_name ?? "",


            registration_no:
              customer.registration_no ?? "",


            phone:
              customer.phone,


            address:
              customer.address,


            email:
              customer.emails
                ?.find(e => e.is_primary)
                ?.email ?? ""

          });



          // refresh validation after loading data

          this.customerForm
            .get("type")
            ?.updateValueAndValidity();


        },


        error: (err) => {

          console.error(
            "Failed loading customer",
            err
          );

        }


      });


  }





  handleSubmit(): void {


    if (this.customerForm.invalid) {

      this.customerForm.markAllAsTouched();

      return;

    }



    const formData =
      this.customerForm.getRawValue();




    const postData = {


      type:
        formData.type,



      first_name:
        this.isPerson
          ? formData.first_name
          : null,



      last_name:
        this.isPerson
          ? formData.last_name
          : null,



      identification_no:
        this.isPerson
          ? formData.identification_no
          : null,



      company_name:
        this.isCompany
          ? formData.company_name
          : null,



      registration_no:
        this.isCompany
          ? formData.registration_no
          : null,



      phone:
        formData.phone,



      address:
        formData.address,



      emails: [

        {

          email:
            formData.email,


          is_primary:
            true

        }

      ]

    };



    console.log(
      "Update payload:",
      postData
    );



    this.customerService
      .updateCustomer(
        this.customerId,
        postData
      )
      .subscribe({


        next: (customer) => {

          console.log(
            "Customer updated successfully",
            customer
          );


          this.router.navigate([
            "/customer"
          ]);

        },


        error: (err) => {

          console.error(
            "Failed updating customer",
            err
          );

        }


      });


  }




  logout() {

    this.authService.logout()
      .subscribe({

        next: () =>
          console.log(
            "Logout successful"
          ),


        error: err =>
          console.error(
            err
          )

      });

  }




  handleCancel() {

    this.router.navigate([
      "/customer"
    ]);

  }


}
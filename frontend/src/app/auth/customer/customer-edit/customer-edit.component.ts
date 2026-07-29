import { Component, OnInit, inject, PLATFORM_ID } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { CommonModule, isPlatformBrowser, isPlatformServer } from "@angular/common";
import { FormsModule, FormGroup, FormControl, ReactiveFormsModule, Validators, ValidationErrors, AbstractControl, } from "@angular/forms";
import { AuthService } from "../../../core/auth/auth.service";
import { CustomerService } from "../../../core/auth/customer/customer.service";

@Component({
  selector: "app-customer-create",
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: "./customer-edit.component.html",
  styleUrl: "./customer-edit.component.scss",
})
export class CustomerEditComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  customerForm = new FormGroup({
    first_name: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),

    last_name: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),

    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.email],
    }),

    phone: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),

    address: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  countryCode = "+60";

  phone = "";

  countries = [
    {
      name: "Malaysia",
      code: "+60",
    },
    {
      name: "Singapore",
      code: "+65",
    },
    {
      name: "Indonesia",
      code: "+62",
    },
    {
      name: "Thailand",
      code: "+66",
    },
    {
      name: "United States",
      code: "+1",
    },
    {
      name: "United Kingdom",
      code: "+44",
    },
  ];

  editing = false;
customerId = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private customerService: CustomerService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");

    console.log("CustomerEditComponent initialized with ID:", id);

    if (id) {
      this.customerId = +id;
      this.loadCustomer(this.customerId);
    }
  }

  loadCustomer(id: number): void {
    console.log(new Date().toISOString(), "CustomerComponent initialized", {
      browser: isPlatformBrowser(this.platformId),
      server: isPlatformServer(this.platformId),
    });

    if (!isPlatformBrowser(this.platformId)) {
      console.log("Skipping API call during SSR");
      return;
    }

    this.customerService.getCustomer(id).subscribe({
      next: (customer) => {
        this.customerForm.patchValue({
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          address: customer.address,
          email: customer.emails?.find((e) => e.is_primary)?.email ?? "",
        });
      },

      error: (err) => {
        console.error(err);
      },
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => console.log("Logout successful"),
      error: (err) => console.error("Logout failed", err),
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
          is_primary: true,
        },
      ],
    };

    this.customerService.updateCustomer(this.customerId, postData).subscribe({
      next: (customer) => {
        console.log("Customer updated successfully:", customer);
        this.router.navigate(["/customer"]);
      },
      error: (err) => {
        console.error("Failed to update customer:", err);
      },
    });
  }

  handleCancel() {
    this.router.navigate(["/customer"]);
  }
}

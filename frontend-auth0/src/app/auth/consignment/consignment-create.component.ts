import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Customer, CustomerService } from '../../core/auth/customer/customer.service';
import { Product, ProductService } from '../../core/auth/product/product.service';
import { ConsignmentService } from '../../core/auth/consignment/consignment.service';

@Component({ selector: 'app-consignment-create', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink], templateUrl: './consignment-create.component.html' })
export class ConsignmentCreateComponent implements OnInit {
  customers: Customer[] = [];
  products: Product[] = [];
  error = '';
  saving = false;
  form: ReturnType<FormBuilder['group']>;
  constructor(private readonly fb: FormBuilder, private readonly customersService: CustomerService, private readonly productsService: ProductService, private readonly consignments: ConsignmentService, private readonly router: Router) {
    this.form = this.fb.group({
      customer_id: [0, [Validators.required, Validators.min(1)]],
      consignment_date: [new Date().toISOString().slice(0, 10), Validators.required],
      commission_rate: ['0', [Validators.required, Validators.min(0), Validators.max(100)]],
      notes: [''],
      items: this.fb.array([this.itemGroup()])
    });
  }
  ngOnInit(): void {
    this.customersService.getCustomers().subscribe({ next: items => this.customers = items, error: () => this.error = 'Unable to load customers.' });
    this.productsService.getProducts().subscribe({ next: response => this.products = response.products, error: () => this.error = 'Unable to load products.' });
  }
  get items(): FormArray { return this.form.get('items') as FormArray; }
  itemGroup() { return this.fb.group({ product_id: [0, [Validators.required, Validators.min(1)]], quantity: [1, [Validators.required, Validators.min(1)]], unit_price: ['', [Validators.required, Validators.min(0.01)]], commission_rate: [''] }); }
  addItem(): void { this.items.push(this.itemGroup()); }
  removeItem(index: number): void { if (this.items.length > 1) this.items.removeAt(index); }
  fillPrice(index: number): void { const product = this.products.find(p => p.id === Number(this.items.at(index).value.product_id)); if (product) this.items.at(index).patchValue({ unit_price: product.price.toFixed(2) }); }
  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.error = '';
    const rawValue = this.form.getRawValue();
    const payload = {
      ...rawValue,
      commission_rate: String(rawValue.commission_rate),
      items: rawValue.items.map((item: any) => ({
        ...item,
        unit_price: String(item.unit_price),
        commission_rate: item.commission_rate === '' ? undefined : String(item.commission_rate)
      }))
    };
    this.consignments.createConsignment(payload).subscribe({ next: result => this.router.navigate(['/consignment', result.consignment.id]), error: err => { this.error = err.error?.error ?? 'Unable to create consignment.'; this.saving = false; } });
  }
}

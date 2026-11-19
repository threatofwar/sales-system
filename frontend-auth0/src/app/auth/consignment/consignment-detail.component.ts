import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Consignment, ConsignmentService } from '../../core/auth/consignment/consignment.service';

@Component({ selector: 'app-consignment-detail', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink], templateUrl: './consignment-detail.component.html' })
export class ConsignmentDetailComponent implements OnInit {
  consignment?: Consignment;
  error = '';
  result?: { invoice_number: string; gross_sales: string; commission: string; amount_payable: string };
  saving = false;
  form: ReturnType<FormBuilder['group']>;
  constructor(private readonly route: ActivatedRoute, private readonly fb: FormBuilder, private readonly consignments: ConsignmentService) {
    this.form = this.fb.group({ items: this.fb.array([]), payment_amount: [''], payment_method: ['CASH'], reference_no: [''], notes: [''] });
  }
  get items(): FormArray { return this.form.get('items') as FormArray; }
  ngOnInit(): void { const id = Number(this.route.snapshot.paramMap.get('id')); this.consignments.getConsignment(id).subscribe({ next: response => { this.consignment = response.consignment; this.setupSettlement(); }, error: () => this.error = 'Unable to load this consignment.' }); }
  setupSettlement(): void { this.items.clear(); this.consignment?.items.forEach(item => this.items.push(this.fb.group({ item_id: [item.id], quantity_sold: [item.quantity_sent, [Validators.required, Validators.min(0)]], quantity_returned: [0, [Validators.required, Validators.min(0)]], quantity_damaged: [0, [Validators.required, Validators.min(0)] ] }))); }
  submit(): void { if (!this.consignment || this.form.invalid) { this.form.markAllAsTouched(); return; } this.saving = true; this.error = ''; this.consignments.settleConsignment(this.consignment.id, this.form.getRawValue()).subscribe({ next: result => { this.result = result; this.saving = false; this.consignment!.status = 'SETTLED'; }, error: err => { this.error = err.error?.error ?? 'Unable to settle consignment.'; this.saving = false; } }); }
}

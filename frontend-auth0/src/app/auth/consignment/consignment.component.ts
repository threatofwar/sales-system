import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Consignment, ConsignmentService } from '../../core/auth/consignment/consignment.service';

@Component({
  selector: 'app-consignment', standalone: true, imports: [CommonModule, RouterLink],
  templateUrl: './consignment.component.html'
})
export class ConsignmentComponent implements OnInit {
  consignments: Consignment[] = [];
  loading = true;
  error = '';
  constructor(private readonly consignmentsService: ConsignmentService) {}
  ngOnInit(): void {
    this.consignmentsService.getConsignments().subscribe({
      next: response => { this.consignments = response.consignments; this.loading = false; },
      error: () => { this.error = 'Unable to load consignments.'; this.loading = false; }
    });
  }
}

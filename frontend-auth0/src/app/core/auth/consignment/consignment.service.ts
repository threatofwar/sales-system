import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ConsignmentItem {
  id?: number;
  product_id: number;
  product_name?: string;
  quantity_sent?: number;
  quantity_sold?: number;
  quantity_returned?: number;
  quantity_damaged?: number;
  quantity?: number;
  unit_price: string;
  commission_rate?: string;
}

export interface Consignment {
  id: number;
  customer_id: number;
  customer_name: string;
  consignment_number: string;
  consignment_date: string;
  commission_rate: string;
  status: 'OPEN' | 'SETTLED' | 'CANCELLED';
  notes?: string;
  items: ConsignmentItem[];
}

@Injectable({ providedIn: 'root' })
export class ConsignmentService {
  private readonly apiUrl = `${environment.apiUrl}/auth/consignment`;

  constructor(private readonly http: HttpClient) {}

  getConsignments(): Observable<{ consignments: Consignment[] }> {
    return this.http.get<{ consignments: Consignment[] }>(this.apiUrl, { withCredentials: true });
  }

  getConsignment(id: number): Observable<{ consignment: Consignment }> {
    return this.http.get<{ consignment: Consignment }>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  createConsignment(body: unknown): Observable<{ consignment: Consignment }> {
    return this.http.post<{ consignment: Consignment }>(this.apiUrl, body, { withCredentials: true });
  }

  settleConsignment(id: number, body: unknown): Observable<{ invoice_id: number; invoice_number: string; gross_sales: string; commission: string; amount_payable: string; status: string }> {
    return this.http.post<{ invoice_id: number; invoice_number: string; gross_sales: string; commission: string; amount_payable: string; status: string }>(`${this.apiUrl}/${id}/settle`, body, { withCredentials: true });
  }
}

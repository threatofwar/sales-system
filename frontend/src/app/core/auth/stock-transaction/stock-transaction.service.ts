import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';


export interface StockTransaction {

  id?: number;

  product_id: number;

  transaction_type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

  quantity: number;

  reference_type?: string;

  reference_id?: number;

  notes?: string;

  created_at?: string;

}


@Injectable({
  providedIn: 'root'
})
export class StockTransactionService {

  private apiUrl = environment.apiUrl;


  constructor(
    private http: HttpClient
  ) {}


  getStockTransactions(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/auth/stock-transaction`,
      {
        withCredentials: true
      }
    );

  }


  getStockTransaction(id: number): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/auth/stock-transaction/${id}`,
      {
        withCredentials: true
      }
    );

  }


  createStockTransaction(
    transaction: StockTransaction
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/auth/stock-transaction`,
      transaction,
      {
        withCredentials: true
      }
    );

  }

}
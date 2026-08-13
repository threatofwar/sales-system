import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';


// ============================================================
// Stock Transaction Types
// ============================================================

export type StockTransactionType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT';


export type StockTransactionSortBy =
  | 'created_at'
  | 'product'
  | 'transaction_type'
  | 'quantity'
  | 'reference_type'
  | 'reference_id';


export type StockTransactionSortOrder =
  | 'asc'
  | 'desc';


// ============================================================
// Stock Transaction
// ============================================================

export interface StockTransaction {

  id?: number;

  product_id: number;

  product_name?: string;

  transaction_type:
    StockTransactionType;

  quantity: number;

  reference_type?: string | null;

  reference_id?: number | null;

  notes?: string | null;

  created_at?: string;

}


// ============================================================
// Pagination
// ============================================================

export interface StockTransactionPagination {

  page: number;

  page_size: number;

  total: number;

  total_pages: number;

}


export interface StockTransactionListResponse {

  transactions:
    StockTransaction[];

  pagination:
    StockTransactionPagination;

}


// ============================================================
// Create Response
// ============================================================

export interface CreateStockTransactionResponse {

  message: string;

  transaction:
    StockTransaction;

}


// ============================================================
// Single Transaction Response
// ============================================================

export interface StockTransactionResponse {

  transaction:
    StockTransaction;

}


// ============================================================
// Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class StockTransactionService {

  private apiUrl =
    environment.apiUrl;


  constructor(
    private http:
      HttpClient
  ) {}


  // ==========================================================
  // Get Paginated Stock Transactions
  // ==========================================================

  getStockTransactions(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    transactionType: string = '',
    sortBy: StockTransactionSortBy = 'created_at',
    sortOrder: StockTransactionSortOrder = 'desc'
  ): Observable<StockTransactionListResponse> {

    let params =
      new HttpParams()
        .set(
          'page',
          page.toString()
        )
        .set(
          'page_size',
          pageSize.toString()
        )
        .set(
          'sort_by',
          sortBy
        )
        .set(
          'sort_order',
          sortOrder
        );


    const cleanedSearch =
      search.trim();

    if (cleanedSearch) {

      params =
        params.set(
          'search',
          cleanedSearch
        );

    }


    const cleanedTransactionType =
      transactionType
        .trim()
        .toUpperCase();

    if (cleanedTransactionType) {

      params =
        params.set(
          'transaction_type',
          cleanedTransactionType
        );

    }


    return this.http.get<StockTransactionListResponse>(
      `${this.apiUrl}/auth/stock-transaction`,
      {
        params,
        withCredentials: true
      }
    );

  }


  // ==========================================================
  // Get Transaction By ID
  // ==========================================================

  getStockTransaction(
    id: number
  ): Observable<StockTransactionResponse> {

    return this.http.get<StockTransactionResponse>(
      `${this.apiUrl}/auth/stock-transaction/${id}`,
      {
        withCredentials: true
      }
    );

  }


  // ==========================================================
  // Create Transaction
  // ==========================================================

  createStockTransaction(
    transaction:
      StockTransaction
  ): Observable<CreateStockTransactionResponse> {

    return this.http.post<CreateStockTransactionResponse>(
      `${this.apiUrl}/auth/stock-transaction`,
      transaction,
      {
        withCredentials: true
      }
    );

  }

}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Product {
  id?: number;

  category_id: number;

  name: string;
  description?: string;

  sku?: string;

  price: number;
  cost_price?: number;

  stock_quantity: number;

  is_active: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface ProductsResponse {
  products: Product[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) {}

  getProducts(): Observable<ProductsResponse> {

    return this.http.get<ProductsResponse>(
      `${this.apiUrl}/auth/product`,
      {
        withCredentials: true
      }
    );

  }

  getProduct(id: number): Observable<{ product: Product }> {

    return this.http.get<{ product: Product }>(
      `${this.apiUrl}/auth/product/${id}`,
      {
        withCredentials: true
      }
    );

  }

  createProduct(product: Product): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/auth/product`,
      product,
      {
        withCredentials: true
      }
    );

  }

  updateProduct(
    id: number,
    product: Product
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/auth/product/${id}`,
      product,
      {
        withCredentials: true
      }
    );

  }

  deleteProduct(id: number): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/auth/product/${id}`,
      {
        withCredentials: true
      }
    );

  }

}
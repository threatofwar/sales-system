import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {

    navItems = [
    {
      name: 'Dashboard',
      route: '/dashboard'
    },
    {
      name: 'Customers',
      route: '/customer'
    },
    {
      name: 'Categories',
      route: '/category'
    },
    {
      name: 'Companies',
      route: '/company'
    },
    {
      name: 'Products',
      route: '/product'
    },
    {
      name: 'Stock Transactions',
      route: '/stock-transaction'
    },
    {
      name: 'Invoices',
      route: '/invoice'
    },
    {
      name: 'Payments',
      route: '/payment'
    }
  ];

  constructor(
    private authService: AuthService
  ) {}

//   logout(): void {
//     this.authService.logout();

//     this.router.navigate(['/login']);
//   }
  logout() {
    this.authService.logout({
      logoutParams: { returnTo: 'http://localhost:4201/login' }
    });
  }

}

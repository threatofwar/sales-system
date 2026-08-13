import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

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
    private authService: AuthService,
    private router: Router
  ) {}

//   logout(): void {
//     this.authService.logout();

//     this.router.navigate(['/login']);
//   }
  logout() {
    this.authService.logout().subscribe({
      next: () => console.log('Logout successful'),
      error: (err) => console.error('Logout failed', err)
    });
  }

}
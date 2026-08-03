import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RegistrationComponent } from './registration/registration.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { DashboardComponent } from './auth/dashboard/dashboard.component';
import { CustomerComponent } from './auth/customer/customer.component';
import { CustomerCreateComponent } from './auth/customer/customer-create/customer-create.component';
import { CustomerEditComponent } from './auth/customer/customer-edit/customer-edit.component';
import { CategoryComponent } from './auth/category/category.component';
import { CategoryCreateComponent } from './auth/category/category-create/category-create.component';
import { CategoryEditComponent } from './auth/category/category-edit/category-edit.component';
import { CompanyComponent } from './auth/company/company.component';
import { LayoutComponent } from './auth/layout/layout.component';
import { authGuard } from './core/auth/auth.guard';
import { publicGuard } from './core/auth/public.guard';
import { ProductComponent } from './auth/product/product.component';
import { ProductCreateComponent } from './auth/product/product-create/product-create.component';
import { ProductEditComponent } from './auth/product/product-edit/product-edit.component';
import { StockTransactionComponent } from './auth/stock-transaction/stock-transaction.component';
import { InvoiceComponent } from './auth/invoice/invoice.component'
import { InvoiceCreateComponent } from './auth/invoice/invoice-create/invoice-create.component';

export const routes: Routes = [
    // Public Routes
    { path: '', component: HomeComponent, canActivate: [publicGuard] },
    { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
    { path: 'registration', component: RegistrationComponent, canActivate: [publicGuard] },
    { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [publicGuard] },
    { path: 'password-reset', component: PasswordResetComponent, canActivate: [publicGuard] },
    // Authenticated Routes
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [

        {
            path: 'dashboard',
            component: DashboardComponent
        },

        // Customer Management Routes
        {
            path: 'customer',
            component: CustomerComponent
        },

        {
            path: 'customer/new',
            component: CustomerCreateComponent
        },

        {
            path: 'customer/:id/edit',
            component: CustomerEditComponent
        },

        // Company Management Routes
        {
            path: 'company',
            component: CompanyComponent
        },

        // Category Management Routes
        {
            path: 'category',
            component: CategoryComponent
        },

        {
            path: 'category/new',
            component: CategoryCreateComponent
        },

        {
            path: 'category/:id/edit',
            component: CategoryEditComponent
        },

        // Product Management Routes
        {
            path: 'product',
            component: ProductComponent
        },

        {
            path: 'product/new',
            component: ProductCreateComponent
        },

        {
            path: 'product/:id/edit',
            component: ProductEditComponent
        },

        // Stock-Transaction Management Routes
        {
            path: 'stock-transaction',
            component: StockTransactionComponent
        },

        // Invoice Management Routes
        {
            path: 'invoice',
            component: InvoiceComponent
        },

        {
            path: 'invoice/new',
            component: InvoiceCreateComponent
        },

        ]
    },
    // Fallback
    {
        path: '**',
        redirectTo: ''
    }
];

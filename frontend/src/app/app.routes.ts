import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { proProfileGuard } from './core/guards/pro-profile.guard';


export const routes: Routes = [

    { path: '', loadComponent: () => import('./pages/public/home/home.page').then(m => m.HomePage) },
    { path: 'auth/login', loadComponent: () => import('./pages/auth/login/login.page').then(m => m.LoginPage) },
    { path: 'auth/register', loadComponent: () => import('./pages/auth/register/register.page').then(m => m.RegisterPage) },

     { path: 'prestataires/:id', loadComponent: () => import('./pages/client/prestataire-detail/prestataire-detail.page')
      .then(m => m.PrestataireDetailPage) },

    { path: 'services', loadComponent: () => import('./pages/client/catalogue-services/catalogue-services.page').then(m => m.CatalogueServicesPage) },
    { path: 'mon-compte', canMatch: [authGuard], loadComponent: () => import('./pages/client/mon-compte/mon-compte.page').then(m => m.MonComptePage) },
  
    {
        path: 'pro/onboarding', canMatch: [authGuard, roleGuard(['PRO'])],
        loadComponent: () => import('./pages/pro/onboarding/onboarding.page').then(m => m.OnboardingPage)
    },

    {
        path: 'pro', canMatch: [authGuard, roleGuard(['PRO']), proProfileGuard],
        loadComponent: () => import('./pages/pro/dashboard/dashboard.page').then(m => m.DashboardPage)
    },

    {
        path: 'pro/services', canMatch: [authGuard, roleGuard(['PRO']), proProfileGuard],
        loadComponent: () => import('./pages/pro/services/services.page').then(m => m.ServicesPage)
    },

    {
        path: 'pro/disponibilites', canMatch: [authGuard, roleGuard(['PRO']), proProfileGuard],
        loadComponent: () => import('./pages/pro/disponibilites/disponibilites.page').then(m => m.DisponibilitesPage)
    },

    {
        path: 'pro/rendezvous', canMatch: [authGuard, roleGuard(['PRO']), proProfileGuard],
        loadComponent: () => import('./pages/pro/rendezvous/rendezvous.page').then(m => m.RendezvousPage)
    },

     
   {
    path: 'admin',
    canMatch: [authGuard, roleGuard(['ADMIN'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/users-list.page').then(m => m.UsersListPage),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./pages/admin/users/user-detail.page').then(m => m.UserDetailPage),
      },
    ],
  },
    { path: '**', redirectTo: '' }
];

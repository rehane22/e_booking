import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanMatchFn = () => {
  const router = inject(Router);
  if (localStorage.getItem('accessToken')) return true;
  router.navigateByUrl('/auth/login');
  return false;
};

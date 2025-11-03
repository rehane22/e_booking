import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard = (allowed: string[]): CanMatchFn => {
  return () => {
    const router = inject(Router);
    const roles: string[] = JSON.parse(localStorage.getItem('roles') ?? '[]');
    if (roles.some(r => allowed.includes(r))) return true;
    router.navigateByUrl('/');
    return false;
  };
};

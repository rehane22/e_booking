import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { PrestataireApi } from '../api/prestataire.api';
import { catchError, map, of } from 'rxjs';

export const proProfileGuard: CanMatchFn = () => {
  const router = inject(Router);
  const api = inject(PrestataireApi);

  return api.me().pipe(
    map(() => true),
    catchError((e) => {
      if (e?.status === 404) {
        return of(router.createUrlTree(['/pro/onboarding']) as unknown as UrlTree);
      }
      return of(router.createUrlTree(['/pro']) as unknown as UrlTree);
    })
  );
};

import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Session } from './session';

const avec = (req: HttpRequest<unknown>, jeton: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } });

/** Bearer sur `/api/` hors `/api/auth/` ; sur 401, un renouvellement partagé puis un rejeu (ADR 0015). */
export const jetonInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(Session);
  const envoye = /^\/api\/(?!auth\/)/.test(req.url) ? session.jeton() : null;
  if (!envoye) return next(req);
  const router = inject(Router);

  return next(avec(req, envoye)).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse) || e.status !== 401) return throwError(() => e);
      // Un renouvellement a déjà eu lieu pendant que cette requête était en vol : on rejoue avec son jeton.
      const rejouer = (ok: boolean) => {
        const jeton = session.jeton();
        if (ok && jeton) return next(avec(req, jeton));
        void router.navigate(['/connexion'], { queryParams: { retour: router.url } });
        return throwError(() => e);
      };
      return session.jeton() !== envoye
        ? rejouer(true)
        : from(session.renouveler()).pipe(switchMap(rejouer));
    }),
  );
};

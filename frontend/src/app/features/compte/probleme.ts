import { HttpErrorResponse } from '@angular/common/http';
import { Probleme } from '../../core/api/models/probleme';

/** Lit le problem+json ; le client généré demande `text`, le corps d'erreur arrive donc en chaîne. */
export function lireProbleme(e: unknown): Probleme | null {
  if (!(e instanceof HttpErrorResponse)) return null;
  try {
    return (typeof e.error === 'string' ? JSON.parse(e.error) : e.error) as Probleme;
  } catch {
    return null;
  }
}

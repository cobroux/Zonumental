import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

/** Pages connectées : sans session (ex. rechargement), tente un renouvellement, sinon /connexion?retour=… */
export const gardeConnecte: CanActivateFn = async (_route, etat) => {
  const session = inject(Session);
  const router = inject(Router); // avant tout await : le contexte d'injection disparaît ensuite
  if (session.connecte() || (await session.renouveler())) return true;
  return router.createUrlTree(['/connexion'], { queryParams: { retour: etat.url } });
};

/** Racine « / » : connecté (ou session récupérable) → /profil, visiteur → /bienvenue (RG-001). */
export const gardeAccueil: CanActivateFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  const connecte = session.connecte() || (await session.renouveler());
  return router.createUrlTree([connecte ? '/profil' : '/bienvenue']);
};

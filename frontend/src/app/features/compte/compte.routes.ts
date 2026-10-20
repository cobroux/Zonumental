import { Routes } from '@angular/router';

// Point d'entrée public de la fonctionnalité (ADR 0012). Les écrans de connexion, profil… s'y ajoutent.
export const COMPTE_ROUTES: Routes = [
  {
    path: 'inscription',
    title: 'Créer mon carnet',
    loadComponent: () => import('./inscription/inscription').then((m) => m.Inscription),
  },
  {
    path: 'verifier-email',
    title: 'Vérification de ton e-mail',
    loadComponent: () =>
      import('./verification-email/verification-email').then((m) => m.VerificationEmail),
  },
];

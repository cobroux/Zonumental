import { Routes } from '@angular/router';

// Point d'entrée public de la fonctionnalité (ADR 0012). Les écrans de connexion, profil… s'y ajoutent.
export const COMPTE_ROUTES: Routes = [
  {
    path: 'connexion',
    title: 'Me connecter',
    loadComponent: () => import('./connexion/connexion').then((m) => m.Connexion),
  },
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
  {
    path: 'mot-de-passe-oublie',
    title: 'Mot de passe oublié',
    loadComponent: () =>
      import('./mot-de-passe-oublie/mot-de-passe-oublie').then((m) => m.MotDePasseOublie),
  },
  {
    path: 'reinitialiser-mot-de-passe',
    title: 'Nouveau mot de passe',
    loadComponent: () =>
      import('./reinitialisation/reinitialisation').then((m) => m.Reinitialisation),
  },
];

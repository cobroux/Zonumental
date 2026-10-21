import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

// Point d'entrée de la fonctionnalité (ADR 0012). Seul /profil est protégé (gardeConnecte).
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
  {
    path: 'profil',
    title: 'Mon profil',
    canActivate: [gardeConnecte],
    loadComponent: () => import('./profil/profil').then((m) => m.Profil),
  },
  {
    path: 'profil/suppression',
    title: 'Supprimer mon compte',
    canActivate: [gardeConnecte],
    loadComponent: () => import('./suppression/suppression').then((m) => m.Suppression),
  },
];

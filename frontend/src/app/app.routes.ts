import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';

// Pages légales publiques (RG-001), sans garde. La page de démonstration n'existe qu'en développement (ADR 0016).
const legal: Routes = [
  {
    path: 'cgu',
    title: "Conditions générales d'utilisation",
    loadComponent: () => import('./features/legal/cgu').then((m) => m.Cgu),
  },
  {
    path: 'confidentialite',
    title: 'Politique de confidentialité',
    loadComponent: () => import('./features/legal/confidentialite').then((m) => m.Confidentialite),
  },
  {
    path: 'mentions-legales',
    title: 'Mentions légales',
    loadComponent: () => import('./features/legal/mentions-legales').then((m) => m.MentionsLegales),
  },
];

const dev: Routes = isDevMode()
  ? [
      {
        path: 'design-system',
        title: 'Design system',
        loadComponent: () =>
          import('./features/design-system/design-system').then((m) => m.DesignSystem),
      },
    ]
  : [];

const compte: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/compte/compte.routes').then((m) => m.COMPTE_ROUTES),
  },
];

export const routes: Routes = [...legal, ...compte, ...dev];

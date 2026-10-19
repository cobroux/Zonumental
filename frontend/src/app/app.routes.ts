import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';

// La page de démonstration n'existe qu'en développement (ADR 0016).
export const routes: Routes = isDevMode()
  ? [
      {
        path: 'design-system',
        title: 'Design system',
        loadComponent: () =>
          import('./features/design-system/design-system').then((m) => m.DesignSystem),
      },
    ]
  : [];

import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

export const EXPLORER_ROUTES: Routes = [
  {
    path: '',
    title: 'Explorer',
    canActivate: [gardeConnecte],
    data: { navigation: true },
    loadComponent: () => import('./explorer').then((m) => m.Explorer),
  },
];

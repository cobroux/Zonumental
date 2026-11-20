import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

export const DEFIS_ROUTES: Routes = [
  {
    path: '',
    title: 'Défis',
    canActivate: [gardeConnecte],
    data: { navigation: true, titre: 'Défis' },
    loadComponent: () => import('./defis').then((m) => m.Defis),
  },
];

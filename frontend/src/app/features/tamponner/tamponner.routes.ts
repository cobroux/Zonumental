import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

export const TAMPONNER_ROUTES: Routes = [
  {
    path: '',
    title: 'Tamponner',
    canActivate: [gardeConnecte],
    data: { navigation: true },
    loadComponent: () => import('./tamponner').then((m) => m.Tamponner),
  },
];

import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

export const CARNET_ROUTES: Routes = [
  {
    path: '',
    title: 'Mon carnet',
    canActivate: [gardeConnecte],
    data: { navigation: true },
    loadComponent: () => import('./carnet').then((m) => m.Carnet),
  },
];

import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

export const MONUMENT_ROUTES: Routes = [
  {
    path: ':numero/capturer',
    title: 'Tamponner',
    canActivate: [gardeConnecte],
    loadComponent: () => import('./camera').then((m) => m.Camera),
  },
  {
    path: ':numero',
    title: 'Monument',
    canActivate: [gardeConnecte],
    loadComponent: () => import('./fiche').then((m) => m.Fiche),
  },
];

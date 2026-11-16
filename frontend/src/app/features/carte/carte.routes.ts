import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

export const CARTE_ROUTES: Routes = [
  {
    path: '',
    title: 'Carte',
    canActivate: [gardeConnecte],
    data: { navigation: true, titre: 'Carte' },
    loadComponent: () => import('./carte').then((m) => m.Carte),
  },
];

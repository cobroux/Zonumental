import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

const bientot = (titre: string): Routes => [
  {
    path: '',
    title: titre,
    canActivate: [gardeConnecte],
    data: { navigation: true, titre },
    loadComponent: () => import('./bientot').then((m) => m.Bientot),
  },
];

export const CARTE_ROUTES = bientot('Carte');
export const DEFIS_ROUTES = bientot('Défis');

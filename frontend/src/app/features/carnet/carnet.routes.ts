import { Routes } from '@angular/router';
import { gardeConnecte } from '../../core/session/garde';

// Sous-écrans à retour : sans la barre, comme le profil.
const ecran = { canActivate: [gardeConnecte] };

export const CARNET_ROUTES: Routes = [
  {
    path: '',
    title: 'Mon carnet',
    canActivate: [gardeConnecte],
    data: { navigation: true },
    loadComponent: () => import('./carnet').then((m) => m.Carnet),
  },
  {
    path: 'collections',
    title: 'Collections',
    ...ecran,
    loadComponent: () => import('./collections').then((m) => m.Collections),
  },
  {
    path: 'collections/:code',
    title: 'Collection',
    ...ecran,
    loadComponent: () => import('./collection').then((m) => m.Collection),
  },
];

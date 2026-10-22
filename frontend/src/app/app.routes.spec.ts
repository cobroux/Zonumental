import { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from './core/api/api-configuration';
import { routes } from './app.routes';
import { gardeAccueil } from './core/session/garde';
import { Cgu } from './features/legal/cgu';
import { Confidentialite } from './features/legal/confidentialite';
import { Inscription } from './features/compte/inscription/inscription';
import { MentionsLegales } from './features/legal/mentions-legales';

const PUBLIQUES: [string, Type<unknown>, RegExp][] = [
  ['cgu', Cgu, /conditions générales/i],
  ['confidentialite', Confidentialite, /confidentialité/i],
  ['mentions-legales', MentionsLegales, /mentions légales/i],
];

describe('Routes publiques (RG-001)', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it.each(PUBLIQUES)(
    '/%s s’ouvre sans garde, avec un titre de page',
    async (chemin, page, titre) => {
      const harness = await RouterTestingHarness.create();
      expect(await harness.navigateByUrl(`/${chemin}`)).toBeInstanceOf(page);
      const route = routes.find((r) => r.path === chemin);
      expect(route?.canActivate).toBeUndefined();
      expect(route?.canMatch).toBeUndefined();
      expect(route?.title).toMatch(titre);
    },
  );

  it('/inscription s’ouvre sans garde (RG-002 à RG-005)', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideApiConfiguration('')],
    });
    const harness = await RouterTestingHarness.create();
    expect(await harness.navigateByUrl('/inscription')).toBeInstanceOf(Inscription);
    const enfants = (await routes.find((r) => r.path === '')?.loadChildren?.()) as Routes;
    const route = enfants.find((r) => r.path === 'inscription');
    expect(route?.canActivate).toBeUndefined();
    expect(route?.title).toMatch(/carnet/i);
  });

  it.each([
    ['bienvenue', /bienvenue/i],
    ['inscription/verifie-ton-email', /e-mail/i],
  ])('/%s est publique, avec un titre (RG-001, RG-007)', async (chemin, titre) => {
    const enfants = (await routes.find((r) => r.path === '')?.loadChildren?.()) as Routes;
    const route = enfants.find((r) => r.path === chemin);
    expect(route?.canActivate).toBeUndefined();
    expect(route?.title).toMatch(titre);
  });

  it('/ aiguille vers /bienvenue ou /profil selon la session', async () => {
    const enfants = (await routes.find((r) => r.path === '')?.loadChildren?.()) as Routes;
    const accueil = enfants.find((r) => r.path === '' && r.pathMatch === 'full');
    expect(accueil?.canActivate).toEqual([gardeAccueil]);
  });
});

describe('Barre de navigation (r1-capturer-8)', () => {
  // Parcourt les routes réelles, enfants différés compris, et relève celles qui demandent la barre.
  async function avecBarre(liste: Routes, prefixe = ''): Promise<string[]> {
    const trouvees: string[] = [];
    for (const r of liste) {
      const chemin = [prefixe, r.path].filter(Boolean).join('/');
      if (r.data?.['navigation'] === true) trouvees.push('/' + chemin);
      const enfants = r.children ?? (await r.loadChildren?.());
      if (Array.isArray(enfants)) trouvees.push(...(await avecBarre(enfants, chemin)));
    }
    return trouvees;
  }

  it('seules /explorer, /carnet, /tamponner et /profil portent la barre', async () => {
    expect((await avecBarre(routes)).sort()).toEqual([
      '/carnet',
      '/explorer',
      '/profil',
      '/tamponner',
    ]);
  });
});

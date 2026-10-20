import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Cgu } from './features/legal/cgu';
import { Confidentialite } from './features/legal/confidentialite';
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
});

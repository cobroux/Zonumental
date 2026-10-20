import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cgu } from './cgu';
import { Confidentialite } from './confidentialite';
import { MentionsLegales } from './mentions-legales';
import { VERSIONS_LEGALES } from './versions-legales';

const PAGES: [string, Type<unknown>, keyof typeof VERSIONS_LEGALES, RegExp][] = [
  ['cgu', Cgu, 'cgu', /conditions générales/i],
  ['confidentialite', Confidentialite, 'confidentialite', /confidentialité/i],
  ['mentions-legales', MentionsLegales, 'mentions', /mentions légales/i],
];

describe('Pages légales', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it.each(PAGES)(
    '/%s : un seul h1, version, bandeau provisoire, liens',
    async (_p, composant, cle, titre) => {
      const fixture = TestBed.createComponent(composant);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const h1 = el.querySelectorAll('h1');
      expect(h1).toHaveLength(1);
      expect(h1[0].textContent).toMatch(titre);
      expect(el.querySelectorAll('h2').length).toBeGreaterThan(0);
      const v = VERSIONS_LEGALES[cle];
      const [a, m, j] = v.date.split('-');
      expect(el.textContent).toContain(`Version ${v.version} du ${j}/${m}/${a}`);
      expect(el.querySelector('zn-message[data-type="info"]')?.textContent).toMatch(/provisoire/i);
      expect(el.querySelector('main')).toBeNull(); // le <main> est dans le shell (app.html)
      expect(el.textContent).not.toMatch(/pok[ée]dex/i);
      const liens = [...el.querySelectorAll('nav[aria-label] a')].map((x) =>
        x.getAttribute('href'),
      );
      expect(liens).toEqual(['/cgu', '/confidentialite', '/mentions-legales']);
    },
  );
});

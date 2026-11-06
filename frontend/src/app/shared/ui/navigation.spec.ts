import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ZnNavigation } from './navigation';

@Component({ template: '' })
class Page {}

let bouton = { etat: 'loin', texte: '> 2 km' };

async function rendre(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'explorer', component: Page },
        { path: 'carnet', component: Page },
        { path: 'tamponner', component: Page },
      ]),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const fixture = TestBed.createComponent(ZnNavigation);
  fixture.componentRef.setInput('bouton', bouton);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('ZnNavigation', () => {
  it('une nav nommée avec trois entrées libellées : Explorer, Tamponner au centre, Carnet (pas Carte ni Défis)', async () => {
    const el = await rendre('/explorer');
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Navigation principale');
    const liens = [...el.querySelectorAll('a')].map((a) => a.textContent?.trim());
    expect(liens).toEqual(['Explorer', '> 2 km', 'Carnet']);
  });

  it.each([
    ['/explorer', 'Explorer'],
    ['/carnet', 'Carnet'],
    ['/tamponner', '> 2 km'],
  ])('%s : seule l’entrée active porte aria-current="page"', async (url, actif) => {
    const el = await rendre(url);
    const courants = [...el.querySelectorAll('a[aria-current="page"]')];
    expect(courants.map((a) => a.textContent?.trim())).toEqual([actif]);
  });

  it('le bouton central mène à /tamponner, état et texte viennent de Proximite', async () => {
    bouton = { etat: 'loin', texte: '> 2 km' };
    const el = await rendre('/explorer');
    const lien = el.querySelector('a[href="/tamponner"]') as HTMLElement;
    expect(lien.textContent?.trim()).toBe('> 2 km');
    expect(lien.dataset['etat']).toBe('loin');
    expect(lien.getAttribute('aria-label')).toBe('Tamponner : > 2 km');
    expect(lien.getAttribute('aria-current')).toBeNull(); // hors /tamponner
  });

  it.each([
    ['proche', '420 m'],
    ['imprecis', 'Signal faible'],
    ['deja', 'Déjà tamponné ici'],
  ])('état %s : texte « %s » porte l’état', async (etat, texte) => {
    bouton = { etat, texte };
    const lien = (await rendre('/explorer')).querySelector('a[href="/tamponner"]') as HTMLElement;
    expect(lien.dataset['etat']).toBe(etat);
    expect(lien.textContent?.trim()).toBe(texte);
  });

  it('zone : halo, libellé « Tamponner »', async () => {
    bouton = { etat: 'zone', texte: 'Tamponner' };
    const lien = (await rendre('/explorer')).querySelector('a[href="/tamponner"]') as HTMLElement;
    expect(lien.dataset['etat']).toBe('zone');
    expect(lien.getAttribute('aria-label')).toBeNull();
    expect(lien.textContent?.trim()).toBe('Tamponner');
  });

  it('les icônes sont décoratives', async () => {
    const el = await rendre('/explorer');
    el.querySelectorAll('svg').forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
  });
});

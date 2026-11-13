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
        { path: 'carte', component: Page },
        { path: 'defis', component: Page },
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

const bouton$ = (el: HTMLElement) => el.querySelector('a[href="/tamponner"]') as HTMLElement;

describe('ZnNavigation', () => {
  it('une nav nommée, 5 <li> dans l’ordre Explorer, Carnet, Tamponner, Carte, Défis', async () => {
    bouton = { etat: 'loin', texte: '> 2 km' };
    const el = await rendre('/explorer');
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Navigation principale');
    const items = [...el.querySelectorAll('nav > ul > li')];
    expect(items.map((li) => li.querySelector('a')?.getAttribute('href'))).toEqual([
      '/explorer',
      '/carnet',
      '/tamponner',
      '/carte',
      '/defis',
    ]);
    expect(items.map((li) => li.textContent?.trim())).toEqual([
      'Explorer',
      'Carnet',
      '> 2 km',
      'Carte',
      'Défis',
    ]);
  });

  it.each([
    ['/explorer', 'Explorer'],
    ['/carnet', 'Carnet'],
    ['/carte', 'Carte'],
    ['/defis', 'Défis'],
    ['/tamponner', '> 2 km'],
  ])('%s : seule l’entrée active porte aria-current="page"', async (url, actif) => {
    bouton = { etat: 'loin', texte: '> 2 km' };
    const el = await rendre(url);
    const courants = [...el.querySelectorAll('a[aria-current="page"]')];
    expect(courants.map((a) => a.textContent?.trim())).toEqual([actif]);
  });

  it('pas d’entrée « Position »', async () => {
    const el = await rendre('/explorer');
    expect(el.textContent).not.toContain('Position');
  });

  it.each([
    ['loin', '> 2 km', 'Tamponner, > 2 km : aucun monument à proximité'],
    ['proche', '420 m', 'Tamponner, monument le plus proche à 420 m'],
    ['proche', '1,2 km', 'Tamponner, monument le plus proche à 1,2 km'],
    ['zone', 'Tamponner', 'Tamponner : tu es dans la zone'],
    ['deja', 'Déjà tamponné', 'Tamponner : déjà tamponné ici'],
    ['imprecis', 'Signal faible', 'Tamponner : signal faible'],
  ])('état %s « %s » : nom accessible contenant le texte visible', async (etat, texte, nom) => {
    bouton = { etat, texte };
    const lien = bouton$(await rendre('/explorer'));
    expect(lien.dataset['etat']).toBe(etat);
    expect(lien.textContent?.trim()).toBe(texte);
    expect(lien.getAttribute('aria-label')).toBe(nom);
    expect(nom.toLowerCase()).toContain(texte.toLowerCase()); // WCAG 2.5.3
    expect(lien.hasAttribute('disabled')).toBe(false);
    expect(lien.getAttribute('aria-current')).toBeNull(); // hors /tamponner
  });

  it('les icônes sont décoratives', async () => {
    const el = await rendre('/explorer');
    el.querySelectorAll('svg').forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
  });
});

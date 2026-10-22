import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ZnNavigation } from './navigation';

@Component({ template: '' })
class Page {}

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
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('ZnNavigation', () => {
  it('une nav nommée avec trois entrées libellées : Explorer, Carnet, Tamponner (pas Carte ni Défis)', async () => {
    const el = await rendre('/explorer');
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Navigation principale');
    const liens = [...el.querySelectorAll('a')].map((a) => a.textContent?.trim());
    expect(liens).toEqual(['Explorer', 'Carnet', 'Tamponner']);
  });

  it.each([
    ['/explorer', 'Explorer'],
    ['/carnet', 'Carnet'],
  ])('%s : seule l’entrée active porte aria-current="page"', async (url, actif) => {
    const el = await rendre(url);
    const courants = [...el.querySelectorAll('a[aria-current="page"]')];
    expect(courants.map((a) => a.textContent?.trim())).toEqual([actif]);
  });

  it('le bouton central mène à /tamponner, état « loin » neutre, libellé toujours texte', async () => {
    const el = await rendre('/explorer');
    const bouton = el.querySelector('a[href="/tamponner"]') as HTMLElement;
    expect(bouton.textContent?.trim()).toBe('Tamponner');
    expect(bouton.dataset['etat']).toBe('loin');
    expect(bouton.getAttribute('aria-current')).toBeNull();
  });

  it('les icônes sont décoratives', async () => {
    const el = await rendre('/explorer');
    el.querySelectorAll('svg').forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
  });
});

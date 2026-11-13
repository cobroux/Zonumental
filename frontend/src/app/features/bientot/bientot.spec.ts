import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session/session';
import { CARTE_ROUTES, DEFIS_ROUTES } from './bientot.routes';

describe('écran Bientôt (Carte, Défis)', () => {
  it.each([
    ['carte', 'Carte', CARTE_ROUTES],
    ['defis', 'Défis', DEFIS_ROUTES],
  ])('/%s : titre « %s », retour, barre demandée', async (path, titre, routes) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path, children: routes }]),
        { provide: Session, useValue: { connecte: () => true } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/' + path);
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toBe(titre);
    expect(el.querySelector('a[aria-label="Retour"]')?.getAttribute('href')).toBe('/explorer');
    expect(routes[0].data?.['navigation']).toBe(true);
  });
});

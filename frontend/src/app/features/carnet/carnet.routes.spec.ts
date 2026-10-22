import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session/session';
import { CARNET_ROUTES } from './carnet.routes';

describe('carnet.routes', () => {
  it('protégée par gardeConnecte, avec la barre et un titre', async () => {
    const route = CARNET_ROUTES[0];
    expect(route.canActivate?.length).toBe(1);
    expect(route.data?.['navigation']).toBe(true);
    expect(route.title).toBe('Mon carnet');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'carnet', children: CARNET_ROUTES }]),
        { provide: Session, useValue: { connecte: () => true } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/carnet');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Mon carnet');
    const profil = harness.routeNativeElement?.querySelector('a[href="/profil"]');
    expect(profil?.getAttribute('aria-label')).toBe('Mon profil');
  });
});

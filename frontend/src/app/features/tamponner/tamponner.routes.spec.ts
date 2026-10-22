import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session/session';
import { TAMPONNER_ROUTES } from './tamponner.routes';

describe('tamponner.routes', () => {
  it('protégée par gardeConnecte, avec la barre et un titre', async () => {
    const route = TAMPONNER_ROUTES[0];
    expect(route.canActivate?.length).toBe(1);
    expect(route.data?.['navigation']).toBe(true);
    expect(route.title).toBe('Tamponner');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'tamponner', children: TAMPONNER_ROUTES }]),
        { provide: Session, useValue: { connecte: () => true } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/tamponner');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Tamponner');
  });
});

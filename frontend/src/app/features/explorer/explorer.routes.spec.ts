import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session/session';
import { EXPLORER_ROUTES } from './explorer.routes';

describe('explorer.routes', () => {
  it('protégée par gardeConnecte, avec la barre et un titre', async () => {
    const route = EXPLORER_ROUTES[0];
    expect(route.canActivate?.length).toBe(1);
    expect(route.data?.['navigation']).toBe(true);
    expect(route.title).toBe('Explorer');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'explorer', children: EXPLORER_ROUTES }]),
        { provide: Session, useValue: { connecte: () => true } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/explorer');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Explorer');
  });
});

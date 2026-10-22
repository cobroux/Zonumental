import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Bienvenue } from './bienvenue';

describe('Bienvenue', () => {
  it('un seul job : titre, accroche, tampon, Commencer et J’ai déjà un carnet', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(Bienvenue);
    await f.whenStable();
    const r = f.nativeElement as HTMLElement;
    expect(r.querySelector('h1')?.textContent).toBe('Zonumental');
    expect(r.textContent).toContain(
      'Va voir les monuments de France. Chaque visite imprime un tampon dans ton carnet.',
    );
    expect(r.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Tampon : Bienvenue');
    expect(r.textContent).not.toContain('118');
    expect(r.querySelector('a[href="/inscription"]')?.textContent).toContain('Commencer');
    expect(r.querySelector('a[href="/connexion"]')?.textContent).toContain('J’ai déjà un carnet');
    expect(r.querySelectorAll('img')).toHaveLength(0);
  });
});
